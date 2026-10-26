package transfer

import (
	"context"
	"errors"
	"fmt"
	"io"
	"math"
	"strconv"
	"strings"

	"github.com/redis/go-redis/v9"
)

const (
	dumpFormat  = "redishub-keys"
	dumpVersion = 1
	dumpPage    = 1000
)

// errKeyGone marks a key that expired or was deleted between SCAN and the read.
var errKeyGone = errors.New("key is gone")

type unsupportedError struct{ kind string }

func (e unsupportedError) Error() string { return "type " + e.kind + " is not exported" }

type countingWriter struct {
	w io.Writer
	n int64
}

func (c *countingWriter) Write(p []byte) (int, error) {
	n, err := c.w.Write(p)
	c.n += int64(n)
	return n, err
}

// dumper pages collections straight into the sink, so a large hash never sits whole in memory.
type dumper struct {
	ctx context.Context
	rdb redis.UniversalClient
	out sink

	key     string
	head    loaded
	started bool
}

func supported(kind string) bool {
	switch kind {
	case "string", "hash", "list", "set", "zset", "stream", "ReJSON-RL":
		return true
	}
	return false
}

// Only errKeyGone and unsupportedError leave the file untouched; any other error may cut a key short.
func (d *dumper) dump(key string) error {
	kind, err := d.rdb.Type(d.ctx, key).Result()
	if err != nil {
		return err
	}
	if kind == "none" {
		return errKeyGone
	}
	if !supported(kind) {
		return unsupportedError{kind}
	}
	ttl, err := d.rdb.PTTL(d.ctx, key).Result()
	if err != nil {
		return err
	}
	if ttl == -2 {
		return errKeyGone
	}
	d.key, d.head, d.started = key, loaded{kind: kind, ttl: -1}, false
	if ttl > 0 {
		d.head.ttl = ttl.Milliseconds()
	}

	// A key that expires or changes type between TYPE and the read, before anything is written,
	// is skipped like one that was gone from the start.
	err = d.value(key, kind)
	if !d.started && (err == nil || errors.Is(err, redis.Nil) || isReplyTo(err, "WRONGTYPE", "ERR no such key")) {
		return errKeyGone
	}
	if err != nil {
		return err
	}
	return d.out.end()
}

func isReplyTo(err error, prefixes ...string) bool {
	var rerr redis.Error
	if !errors.As(err, &rerr) {
		return false
	}
	for _, p := range prefixes {
		if strings.HasPrefix(rerr.Error(), p) {
			return true
		}
	}
	return false
}

// The key's header waits for its first item, so a key that vanished mid-read writes nothing.
func (d *dumper) start() error {
	if d.started {
		return nil
	}
	d.started = true
	return d.out.begin(d.key, d.head)
}

func (d *dumper) item(v any) error {
	if err := d.start(); err != nil {
		return err
	}
	return d.out.item(v)
}

func (d *dumper) value(key, kind string) error {
	switch kind {
	case "string":
		v, err := d.rdb.Get(d.ctx, key).Result()
		if err != nil {
			return err
		}
		return d.item(v)
	case "hash":
		return d.scan(func(cur uint64) ([]string, uint64, error) {
			return d.rdb.HScan(d.ctx, key, cur, "*", dumpPage).Result()
		}, 2, func(p []string) any { return pair{p[0], p[1]} })
	case "set":
		return d.scan(func(cur uint64) ([]string, uint64, error) {
			return d.rdb.SScan(d.ctx, key, cur, "*", dumpPage).Result()
		}, 1, func(p []string) any { return p[0] })
	case "zset":
		return d.scan(func(cur uint64) ([]string, uint64, error) {
			return d.rdb.ZScan(d.ctx, key, cur, "*", dumpPage).Result()
		}, 2, func(p []string) any {
			s, _ := strconv.ParseFloat(p[1], 64)
			return scored{p[0], s}
		})
	case "list":
		return d.list(key)
	case "stream":
		return d.stream(key)
	case "ReJSON-RL":
		v, err := d.rdb.JSONGet(d.ctx, key).Result()
		if err != nil {
			return err
		}
		return d.item(jsonDoc(v))
	}
	return nil
}

// HSCAN may return an element twice while the hash rehashes; import writes are idempotent for it.
func (d *dumper) scan(page func(cur uint64) ([]string, uint64, error), width int, item func([]string) any) error {
	var cur uint64
	for {
		vals, next, err := page(cur)
		if err != nil {
			return err
		}
		for i := 0; i+width <= len(vals); i += width {
			if err := d.item(item(vals[i : i+width])); err != nil {
				return err
			}
		}
		if next == 0 {
			return nil
		}
		cur = next
	}
}

func (d *dumper) list(key string) error {
	for start := int64(0); ; start += dumpPage {
		vals, err := d.rdb.LRange(d.ctx, key, start, start+dumpPage-1).Result()
		if err != nil {
			return err
		}
		for _, v := range vals {
			if err := d.item(v); err != nil {
				return err
			}
		}
		if len(vals) < dumpPage {
			return nil
		}
	}
}

// Raw XRANGE rather than go-redis XRange, whose map loses the order of an entry's fields.
// Only a group's position travels; its consumers and pending entries do not.
func (d *dumper) stream(key string) error {
	groups, err := d.rdb.XInfoGroups(d.ctx, key).Result()
	if err != nil {
		return err
	}
	for _, g := range groups {
		d.head.groups = append(d.head.groups, group{g.Name, g.LastDeliveredID})
	}
	start := "-"
	for {
		rows, err := d.rdb.Do(d.ctx, "XRANGE", key, start, "+", "COUNT", dumpPage).Slice()
		if err != nil {
			return err
		}
		var last string
		for _, row := range rows {
			raw, ok := row.([]any)
			if !ok || len(raw) != 2 {
				return fmt.Errorf("unexpected XRANGE reply")
			}
			id, _ := raw[0].(string)
			kv, _ := raw[1].([]any)
			e := entry{id: id, fields: make([]pair, 0, len(kv)/2)}
			for i := 0; i+1 < len(kv); i += 2 {
				f, _ := kv[i].(string)
				v, _ := kv[i+1].(string)
				e.fields = append(e.fields, pair{f, v})
			}
			if err := d.item(e); err != nil {
				return err
			}
			last = id
		}
		if len(rows) < dumpPage {
			// A stream with groups lives on with no entries, and XGROUP CREATE MKSTREAM rebuilds it.
			if len(d.head.groups) > 0 {
				return d.start()
			}
			return nil
		}
		start = nextStreamID(last)
	}
}

// "(" exclusive ranges need Redis 6.2, so the next start is the last ID plus one.
func nextStreamID(id string) string {
	ms, seq, ok := strings.Cut(id, "-")
	if !ok {
		return id
	}
	n, err := strconv.ParseUint(seq, 10, 64)
	if err != nil {
		return id
	}
	if n == math.MaxUint64 {
		m, _ := strconv.ParseUint(ms, 10, 64)
		return strconv.FormatUint(m+1, 10) + "-0"
	}
	return ms + "-" + strconv.FormatUint(n+1, 10)
}
