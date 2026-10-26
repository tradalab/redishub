package transfer

import (
	"bufio"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"os"
	"unicode/utf8"

	"github.com/vmihailenco/msgpack/v5"
	"github.com/vmihailenco/msgpack/v5/msgpcode"
)

const (
	formatNDJSON  = "ndjson"
	formatMsgpack = "msgpack"
)

// Values of a key as both formats see them: a string for string, list and set members, and
// these for the rest.
type (
	pair   struct{ a, b string }
	scored struct {
		member string
		score  float64
	}
	entry struct {
		id     string
		fields []pair
	}
	jsonDoc string
	group   struct{ name, id string }
)

type loaded struct {
	kind   string
	ttl    int64
	items  []any
	groups []group
}

type sink interface {
	header() error
	begin(key string, head loaded) error
	item(v any) error
	end() error
}

func newSink(format string, w io.Writer) sink {
	if format == formatMsgpack {
		return &msgpackSink{enc: msgpack.NewEncoder(w)}
	}
	return &jsonSink{w: w}
}

// NDJSON: one key per line. JSON strings must be UTF-8, so binary travels as {"$b64": "..."},
// and JSON has no infinity, so scores use "+inf" and "-inf" as ZADD does.
type jsonSink struct {
	w      io.Writer
	scalar bool
	first  bool
}

func blob(s string) any {
	if utf8.ValidString(s) {
		return s
	}
	return map[string]string{"$b64": base64.StdEncoding.EncodeToString([]byte(s))}
}

func score(s float64) any {
	switch {
	case math.IsInf(s, 1):
		return "+inf"
	case math.IsInf(s, -1):
		return "-inf"
	}
	return s
}

func (s *jsonSink) raw(b []byte) error {
	_, err := s.w.Write(b)
	return err
}

func (s *jsonSink) json(v any) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	return s.raw(b)
}

func (s *jsonSink) header() error {
	if err := s.json(map[string]any{"format": dumpFormat, "version": dumpVersion}); err != nil {
		return err
	}
	return s.raw([]byte("\n"))
}

func (s *jsonSink) begin(key string, h loaded) error {
	k, _ := json.Marshal(blob(key))
	s.scalar = h.kind == "string" || h.kind == "ReJSON-RL"
	s.first = true
	head := fmt.Sprintf(`{"key":%s,"type":%q,"ttl":%d,`, k, h.kind, h.ttl)
	if len(h.groups) > 0 {
		gs := make([]any, len(h.groups))
		for i, g := range h.groups {
			gs[i] = map[string]any{"name": blob(g.name), "id": g.id}
		}
		b, err := json.Marshal(gs)
		if err != nil {
			return err
		}
		head += `"groups":` + string(b) + ","
	}
	head += `"value":`
	if !s.scalar {
		head += "["
	}
	return s.raw([]byte(head))
}

func (s *jsonSink) item(v any) error {
	if !s.first {
		if err := s.raw([]byte(",")); err != nil {
			return err
		}
	}
	s.first = false
	switch v := v.(type) {
	case string:
		return s.json(blob(v))
	case pair:
		return s.json([]any{blob(v.a), blob(v.b)})
	case scored:
		return s.json([]any{blob(v.member), score(v.score)})
	case entry:
		fields := make([]any, len(v.fields))
		for i, f := range v.fields {
			fields[i] = []any{blob(f.a), blob(f.b)}
		}
		return s.json(map[string]any{"id": v.id, "fields": fields})
	case jsonDoc:
		if !json.Valid([]byte(v)) {
			return errors.New("JSON.GET returned invalid JSON")
		}
		return s.raw([]byte(v))
	}
	return fmt.Errorf("unexpected item %T", v)
}

func (s *jsonSink) end() error {
	if s.scalar {
		return s.raw([]byte("}\n"))
	}
	return s.raw([]byte("]}\n"))
}

// Msgpack: a header map per key, its items one by one, then nil. The item count is never known
// before the scan ends, so no array header can go first.
type msgpackSink struct{ enc *msgpack.Encoder }

type msgpackHead struct {
	Key    any            `msgpack:"key"`
	Type   string         `msgpack:"type"`
	TTL    int64          `msgpack:"ttl"`
	Groups []msgpackGroup `msgpack:"groups,omitempty"`
}

type msgpackGroup struct {
	Name string `msgpack:"name"`
	ID   string `msgpack:"id"`
}

type msgpackFileHead struct {
	Format  string `msgpack:"format"`
	Version int    `msgpack:"version"`
}

func (s *msgpackSink) str(v string) error {
	if utf8.ValidString(v) {
		return s.enc.EncodeString(v)
	}
	return s.enc.EncodeBytes([]byte(v))
}

func (s *msgpackSink) header() error {
	return s.enc.Encode(msgpackFileHead{Format: dumpFormat, Version: dumpVersion})
}

func (s *msgpackSink) begin(key string, h loaded) error {
	var k any = key
	if !utf8.ValidString(key) {
		k = []byte(key)
	}
	head := msgpackHead{Key: k, Type: h.kind, TTL: h.ttl}
	for _, g := range h.groups {
		head.Groups = append(head.Groups, msgpackGroup{g.name, g.id})
	}
	return s.enc.Encode(head)
}

func (s *msgpackSink) item(v any) error {
	switch v := v.(type) {
	case string:
		return s.str(v)
	case jsonDoc:
		return s.enc.EncodeString(string(v))
	case pair:
		return s.strs(v.a, v.b)
	case scored:
		if err := s.enc.EncodeArrayLen(2); err != nil {
			return err
		}
		if err := s.str(v.member); err != nil {
			return err
		}
		return s.enc.EncodeFloat64(v.score)
	case entry:
		if err := s.enc.EncodeArrayLen(2); err != nil {
			return err
		}
		if err := s.enc.EncodeString(v.id); err != nil {
			return err
		}
		if err := s.enc.EncodeArrayLen(len(v.fields)); err != nil {
			return err
		}
		for _, f := range v.fields {
			if err := s.strs(f.a, f.b); err != nil {
				return err
			}
		}
		return nil
	}
	return fmt.Errorf("unexpected item %T", v)
}

func (s *msgpackSink) strs(a, b string) error {
	if err := s.enc.EncodeArrayLen(2); err != nil {
		return err
	}
	if err := s.str(a); err != nil {
		return err
	}
	return s.str(b)
}

func (s *msgpackSink) end() error { return s.enc.EncodeNil() }

// recordError is one bad key; the reader can carry on past it.
type recordError struct{ err error }

func (e recordError) Error() string { return e.err.Error() }
func (e recordError) Unwrap() error { return e.err }

type source interface {
	// next returns io.EOF at the end and a recordError for a key that can be skipped.
	next() (string, loaded, error)
	// where names the current key in an error: a line for NDJSON, an ordinal for msgpack.
	where() string
}

type countingReader struct {
	r io.Reader
	n int64
}

func (c *countingReader) Read(p []byte) (int, error) {
	n, err := c.r.Read(p)
	c.n += int64(n)
	return n, err
}

type dumpFile struct {
	f    *os.File
	read *countingReader
	src  source
}

func (d *dumpFile) Close() error { return d.f.Close() }

// The format is told from the first byte, not the extension: NDJSON opens with "{" and the
// msgpack header is a fixmap.
func openDump(path string) (*dumpFile, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	cr := &countingReader{r: f}
	br := bufio.NewReaderSize(cr, 1<<20)
	first, err := br.Peek(1)
	if err == io.EOF {
		f.Close()
		return nil, errors.New("the file is empty")
	}
	if err != nil {
		f.Close()
		return nil, err
	}
	var src source
	var format, version = "", 0
	if first[0] == '{' {
		j := &jsonSource{r: br}
		src = j
		var h struct {
			Format  string `json:"format"`
			Version int    `json:"version"`
		}
		line, err := j.line()
		if err == nil && json.Unmarshal(line, &h) == nil {
			format, version = h.Format, h.Version
		}
	} else {
		m := &msgpackSource{dec: msgpack.NewDecoder(br)}
		src = m
		var h msgpackFileHead
		if m.dec.Decode(&h) == nil {
			format, version = h.Format, h.Version
		}
	}
	if format != dumpFormat {
		f.Close()
		return nil, errors.New("not a RedisHub key export")
	}
	if version != dumpVersion {
		f.Close()
		return nil, fmt.Errorf("export version %d is not supported", version)
	}
	return &dumpFile{f: f, read: cr, src: src}, nil
}

type jsonSource struct {
	r *bufio.Reader
	n int
}

// ReadBytes rather than a Scanner: a single key line can be far larger than any fixed buffer.
func (s *jsonSource) line() ([]byte, error) {
	for {
		line, err := s.r.ReadBytes('\n')
		if len(line) > 0 || err == nil {
			s.n++
			if line = bytes.TrimSpace(line); len(line) > 0 {
				return line, nil
			}
		}
		if err != nil {
			return nil, err
		}
	}
}

func (s *jsonSource) where() string { return fmt.Sprintf("line %d", s.n) }

func (s *jsonSource) next() (string, loaded, error) {
	line, err := s.line()
	if err != nil {
		return "", loaded{}, err
	}
	var rec struct {
		Key    json.RawMessage `json:"key"`
		Type   string          `json:"type"`
		TTL    int64           `json:"ttl"`
		Groups []struct {
			Name json.RawMessage `json:"name"`
			ID   string          `json:"id"`
		} `json:"groups"`
		Value json.RawMessage `json:"value"`
	}
	if err := json.Unmarshal(line, &rec); err != nil {
		return "", loaded{}, recordError{err}
	}
	key, err := unblob(rec.Key)
	if err != nil {
		return "", loaded{}, recordError{fmt.Errorf("key: %w", err)}
	}
	if !supported(rec.Type) {
		return key, loaded{}, recordError{unsupportedError{rec.Type}}
	}
	items, err := jsonItems(rec.Type, rec.Value)
	if err != nil {
		return key, loaded{}, recordError{err}
	}
	out := loaded{kind: rec.Type, ttl: rec.TTL, items: items}
	for _, g := range rec.Groups {
		name, err := unblob(g.Name)
		if err != nil {
			return key, loaded{}, recordError{fmt.Errorf("group: %w", err)}
		}
		out.groups = append(out.groups, group{name, g.ID})
	}
	if err := validate(out); err != nil {
		return key, loaded{}, recordError{err}
	}
	return key, out, nil
}

func unblob(raw json.RawMessage) (string, error) {
	var s string
	if json.Unmarshal(raw, &s) == nil {
		return s, nil
	}
	var b struct {
		B64 *string `json:"$b64"`
	}
	if err := json.Unmarshal(raw, &b); err != nil || b.B64 == nil {
		return "", errors.New(`expected a string or {"$b64": ...}`)
	}
	v, err := base64.StdEncoding.DecodeString(*b.B64)
	return string(v), err
}

func unscore(raw json.RawMessage) (float64, error) {
	var f float64
	if json.Unmarshal(raw, &f) == nil {
		return f, nil
	}
	var s string
	if err := json.Unmarshal(raw, &s); err != nil {
		return 0, err
	}
	switch s {
	case "+inf":
		return math.Inf(1), nil
	case "-inf":
		return math.Inf(-1), nil
	}
	return 0, fmt.Errorf("bad score %q", s)
}

func jsonPairs(raw json.RawMessage) ([][2]string, error) {
	var rows [][2]json.RawMessage
	if err := json.Unmarshal(raw, &rows); err != nil {
		return nil, err
	}
	out := make([][2]string, len(rows))
	for i, r := range rows {
		a, err := unblob(r[0])
		if err != nil {
			return nil, err
		}
		b, err := unblob(r[1])
		if err != nil {
			return nil, err
		}
		out[i] = [2]string{a, b}
	}
	return out, nil
}

func jsonItems(kind string, raw json.RawMessage) ([]any, error) {
	switch kind {
	case "string":
		v, err := unblob(raw)
		return []any{v}, err
	case "ReJSON-RL":
		if !json.Valid(raw) {
			return nil, errors.New("invalid JSON document")
		}
		return []any{jsonDoc(raw)}, nil
	case "list", "set":
		var rows []json.RawMessage
		if err := json.Unmarshal(raw, &rows); err != nil {
			return nil, err
		}
		out := make([]any, len(rows))
		for i, r := range rows {
			v, err := unblob(r)
			if err != nil {
				return nil, err
			}
			out[i] = v
		}
		return out, nil
	case "hash":
		rows, err := jsonPairs(raw)
		out := make([]any, len(rows))
		for i, r := range rows {
			out[i] = pair{r[0], r[1]}
		}
		return out, err
	case "zset":
		var rows [][2]json.RawMessage
		if err := json.Unmarshal(raw, &rows); err != nil {
			return nil, err
		}
		out := make([]any, len(rows))
		for i, r := range rows {
			m, err := unblob(r[0])
			if err != nil {
				return nil, err
			}
			s, err := unscore(r[1])
			if err != nil {
				return nil, err
			}
			out[i] = scored{m, s}
		}
		return out, nil
	case "stream":
		var rows []struct {
			ID     string          `json:"id"`
			Fields json.RawMessage `json:"fields"`
		}
		if err := json.Unmarshal(raw, &rows); err != nil {
			return nil, err
		}
		out := make([]any, len(rows))
		for i, r := range rows {
			fields, err := jsonPairs(r.Fields)
			if err != nil {
				return nil, err
			}
			e := entry{id: r.ID, fields: make([]pair, len(fields))}
			for j, f := range fields {
				e.fields[j] = pair{f[0], f[1]}
			}
			out[i] = e
		}
		return out, nil
	}
	return nil, unsupportedError{kind}
}

// A msgpack stream cannot resync after a bad byte, so only a type it skips cleanly is a
// recordError; anything else ends the read.
type msgpackSource struct {
	dec *msgpack.Decoder
	n   int
}

func (s *msgpackSource) where() string { return fmt.Sprintf("key %d", s.n) }

func (s *msgpackSource) str() (string, error) {
	v, err := s.dec.DecodeInterface()
	if err != nil {
		return "", err
	}
	switch v := v.(type) {
	case string:
		return v, nil
	case []byte:
		return string(v), nil
	}
	return "", fmt.Errorf("expected a string, got %T", v)
}

func (s *msgpackSource) pair() (pair, error) {
	if n, err := s.dec.DecodeArrayLen(); err != nil || n != 2 {
		return pair{}, fmt.Errorf("expected a pair")
	}
	a, err := s.str()
	if err != nil {
		return pair{}, err
	}
	b, err := s.str()
	return pair{a, b}, err
}

func (s *msgpackSource) next() (string, loaded, error) {
	var head msgpackHead
	if err := s.dec.Decode(&head); err != nil {
		return "", loaded{}, err
	}
	s.n++
	var key string
	switch k := head.Key.(type) {
	case string:
		key = k
	case []byte:
		key = string(k)
	default:
		return "", loaded{}, fmt.Errorf("%s: bad key", s.where())
	}

	rec := loaded{kind: head.Type, ttl: head.TTL}
	for _, g := range head.Groups {
		rec.groups = append(rec.groups, group{g.Name, g.ID})
	}
	for {
		code, err := s.dec.PeekCode()
		if err != nil {
			return "", loaded{}, err
		}
		if code == msgpcode.Nil {
			if err := s.dec.DecodeNil(); err != nil {
				return "", loaded{}, err
			}
			break
		}
		if !supported(head.Type) {
			if err := s.dec.Skip(); err != nil {
				return "", loaded{}, err
			}
			continue
		}
		item, err := s.item(head.Type)
		if err != nil {
			return "", loaded{}, fmt.Errorf("%s: %w", s.where(), err)
		}
		rec.items = append(rec.items, item)
	}
	if !supported(head.Type) {
		return key, loaded{}, recordError{unsupportedError{head.Type}}
	}
	if err := validate(rec); err != nil {
		return key, loaded{}, recordError{err}
	}
	return key, rec, nil
}

func (s *msgpackSource) item(kind string) (any, error) {
	switch kind {
	case "string", "list", "set":
		return s.str()
	case "ReJSON-RL":
		v, err := s.str()
		return jsonDoc(v), err
	case "hash":
		return s.pair()
	case "zset":
		if n, err := s.dec.DecodeArrayLen(); err != nil || n != 2 {
			return nil, fmt.Errorf("expected a member and a score")
		}
		m, err := s.str()
		if err != nil {
			return nil, err
		}
		sc, err := s.dec.DecodeFloat64()
		return scored{m, sc}, err
	case "stream":
		if n, err := s.dec.DecodeArrayLen(); err != nil || n != 2 {
			return nil, fmt.Errorf("expected an id and fields")
		}
		id, err := s.str()
		if err != nil {
			return nil, err
		}
		n, err := s.dec.DecodeArrayLen()
		if err != nil {
			return nil, err
		}
		e := entry{id: id, fields: make([]pair, 0, max(n, 0))}
		for range n {
			p, err := s.pair()
			if err != nil {
				return nil, err
			}
			e.fields = append(e.fields, p)
		}
		return e, nil
	}
	return nil, unsupportedError{kind}
}
