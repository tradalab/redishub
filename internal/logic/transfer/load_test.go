package transfer

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"os"
	"reflect"
	"strings"
	"testing"
)

func TestWriteCmdsChunksLargeHashes(t *testing.T) {
	items := make([]any, 2500)
	for i := range items {
		items[i] = pair{fmt.Sprintf("f%d", i), "v"}
	}
	cmds, err := writeCmds("h", loaded{kind: "hash", items: items})
	if err != nil {
		t.Fatal(err)
	}
	if len(cmds) != 3 || cmds[0][0] != "HSET" || len(cmds[0]) != 2+2*dumpPage || len(cmds[2]) != 2+2*500 {
		t.Fatalf("got %d commands", len(cmds))
	}
}

func TestJSONItemsDecodeBinaryAndInfinity(t *testing.T) {
	items, err := jsonItems("zset", json.RawMessage(`[[{"$b64":"/wA="},"+inf"],["a",1.5]]`))
	if err != nil {
		t.Fatal(err)
	}
	want := []any{scored{"\xff\x00", math.Inf(1)}, scored{"a", 1.5}}
	if !reflect.DeepEqual(items, want) {
		t.Fatalf("items = %#v", items)
	}
}

func TestValidateRejectsWhatRedisCannotHold(t *testing.T) {
	for _, rec := range []loaded{
		{kind: "set"},
		{kind: "stream", items: []any{entry{id: "1-0"}}},
	} {
		if validate(rec) == nil {
			t.Errorf("%s: want an error", rec.kind)
		}
	}
}

// An empty value must not stop the read: the keys after it still import.
func TestEmptyValueIsSkippable(t *testing.T) {
	for _, format := range []string{formatNDJSON, formatMsgpack} {
		var buf bytes.Buffer
		out := newSink(format, &buf)
		_ = out.header()
		_ = out.begin("e", loaded{kind: "set", ttl: -1})
		_ = out.end()
		_ = out.begin("s", loaded{kind: "set", ttl: -1})
		_ = out.item("m")
		_ = out.end()
		path := t.TempDir() + "/dump"
		if err := os.WriteFile(path, buf.Bytes(), 0o600); err != nil {
			t.Fatal(err)
		}
		df, err := openDump(path)
		if err != nil {
			t.Fatal(err)
		}
		if _, _, err := df.src.next(); !errors.As(err, new(recordError)) {
			t.Errorf("%s: empty set gave %v", format, err)
		}
		if key, _, err := df.src.next(); err != nil || key != "s" {
			t.Errorf("%s: next key %q, %v", format, key, err)
		}
		df.Close()
	}
}

func TestTokenIsSingleUse(t *testing.T) {
	token := remember("/tmp/x.ndjson", false)
	if f, ok := forget(token); !ok || f.path != "/tmp/x.ndjson" {
		t.Fatal("first take")
	}
	if _, ok := forget(token); ok {
		t.Fatal("token reused")
	}
}

func TestUploadsAreCapped(t *testing.T) {
	dir := t.TempDir()
	var tokens []string
	for i := range 3 {
		makeRoomForUpload(2)
		path := fmt.Sprintf("%s/u%d", dir, i)
		if err := os.WriteFile(path, nil, 0o600); err != nil {
			t.Fatal(err)
		}
		tokens = append(tokens, remember(path, true))
	}
	if _, err := os.Stat(dir + "/u0"); !os.IsNotExist(err) {
		t.Error("oldest upload kept")
	}
	if _, ok := lookup(tokens[0]); ok {
		t.Error("oldest token still valid")
	}
	for _, tok := range tokens[1:] {
		if f, ok := forget(tok); !ok {
			t.Error("newer upload evicted")
		} else {
			f.discard()
		}
	}
}

// Both formats must hand Import the same keys, including binary ones and a type they skip.
func TestFormatsRoundTrip(t *testing.T) {
	keys := []struct {
		key  string
		rec  loaded
		skip bool
	}{
		{key: "s", rec: loaded{kind: "string", ttl: 5000, items: []any{"hello <b>"}}},
		{key: "\xff\x00bin", rec: loaded{kind: "list", ttl: -1, items: []any{"a", "\xc3\x28"}}},
		{key: "h", rec: loaded{kind: "hash", ttl: -1, items: []any{pair{"f", "\x00v"}}}},
		{key: "z", rec: loaded{kind: "zset", ttl: -1, items: []any{scored{"m", math.Inf(-1)}, scored{"n", 2}}}},
		{key: "x", rec: loaded{kind: "stream", ttl: -1, items: []any{entry{id: "1-0", fields: []pair{{"b", "2"}, {"a", "1"}}}}, groups: []group{{"g\xff", "1-0"}}}},
		{key: "xg", rec: loaded{kind: "stream", ttl: -1, groups: []group{{"g", "0-0"}}}},
		{key: "j", rec: loaded{kind: "ReJSON-RL", ttl: -1, items: []any{jsonDoc(`{"a":[1,2]}`)}}},
		{key: "g", rec: loaded{kind: "graphdata", ttl: -1, items: []any{"blob"}}, skip: true},
	}
	for _, format := range []string{formatNDJSON, formatMsgpack} {
		var buf bytes.Buffer
		out := newSink(format, &buf)
		if err := out.header(); err != nil {
			t.Fatal(err)
		}
		for _, k := range keys {
			out.begin(k.key, k.rec)
			for _, it := range k.rec.items {
				if k.skip {
					if ms, ok := out.(*msgpackSink); ok {
						ms.str(it.(string))
					} else {
						out.(*jsonSink).json(it)
					}
					continue
				}
				if err := out.item(it); err != nil {
					t.Fatal(err)
				}
			}
			out.end()
		}
		path := t.TempDir() + "/dump"
		os.WriteFile(path, buf.Bytes(), 0o600)
		df, err := openDump(path)
		if err != nil {
			t.Fatalf("%s: %v", format, err)
		}
		for _, want := range keys {
			key, rec, err := df.src.next()
			if want.skip {
				if !errors.As(err, new(recordError)) {
					t.Fatalf("%s %q: want a skippable error, got %v", format, want.key, err)
				}
				continue
			}
			if len(rec.items) == 0 {
				rec.items = nil
			}
			if err != nil || key != want.key || !reflect.DeepEqual(rec, want.rec) {
				t.Fatalf("%s: got %q %#v %v, want %q %#v", format, key, rec, err, want.key, want.rec)
			}
		}
		if _, _, err := df.src.next(); err != io.EOF {
			t.Fatalf("%s: want EOF, got %v", format, err)
		}
		df.Close()
	}
}

func TestOpenDumpRejectsForeignFiles(t *testing.T) {
	for _, body := range []string{"", `{"hello":1}` + "\n", "plain text"} {
		path := t.TempDir() + "/f"
		os.WriteFile(path, []byte(body), 0o600)
		if df, err := openDump(path); err == nil {
			df.Close()
			t.Errorf("%q: want an error", strings.TrimSpace(body))
		}
	}
}
