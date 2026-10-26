package transfer

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

const storedTTL = 30 * time.Minute

// The client holds tokens, never paths, so Import only reads a file the user picked in the dialog
// or uploaded. temp marks an upload, which is deleted once used or expired.
var stored = struct {
	sync.Mutex
	files map[string]storedFile
}{files: map[string]storedFile{}}

type storedFile struct {
	path string
	temp bool
	at   time.Time
}

func remember(path string, temp bool) string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	token := hex.EncodeToString(b)
	stored.Lock()
	defer stored.Unlock()
	for t, f := range stored.files {
		if time.Since(f.at) > storedTTL {
			f.discard()
			delete(stored.files, t)
		}
	}
	stored.files[token] = storedFile{path: path, temp: temp, at: time.Now()}
	return token
}

// Refreshes the token, so a slow upload does not expire between its chunks.
func lookup(token string) (storedFile, bool) {
	stored.Lock()
	defer stored.Unlock()
	f, ok := stored.files[token]
	if !ok || time.Since(f.at) > storedTTL {
		return f, false
	}
	f.at = time.Now()
	stored.files[token] = f
	return f, true
}

// A closed import dialog leaves its upload behind, so the oldest one gives way rather than
// blocking new uploads until it expires. Files a stopped process left behind go too.
func makeRoomForUpload(limit int) {
	stored.Lock()
	defer stored.Unlock()
	sweepOrphans()
	n, oldest := 0, ""
	for t, f := range stored.files {
		if f.temp {
			n++
			if oldest == "" || f.at.Before(stored.files[oldest].at) {
				oldest = t
			}
		}
	}
	if n >= limit {
		stored.files[oldest].discard()
		delete(stored.files, oldest)
	}
}

func forget(token string) (storedFile, bool) {
	stored.Lock()
	defer stored.Unlock()
	f, ok := stored.files[token]
	delete(stored.files, token)
	return f, ok && time.Since(f.at) <= storedTTL
}

const uploadPattern = "redishub-import-*"

// Appends keep a live upload's mtime fresh, so twice the TTL only catches files nobody holds.
func sweepOrphans() {
	held := map[string]bool{}
	for _, f := range stored.files {
		held[f.path] = true
	}
	paths, _ := filepath.Glob(filepath.Join(os.TempDir(), uploadPattern))
	for _, p := range paths {
		if info, err := os.Stat(p); err == nil && !held[p] && time.Since(info.ModTime()) > 2*storedTTL {
			os.Remove(p)
		}
	}
}

func (f storedFile) discard() {
	if f.temp {
		os.Remove(f.path)
	}
}

var errKeyExists = errors.New("key exists")

// One MULTI per key, so a key is never visible half written. Cluster routes it whole, being one slot.
func loadKey(ctx context.Context, rdb redis.UniversalClient, key string, rec loaded, overwrite, keepTTL bool) error {
	cmds, err := writeCmds(key, rec)
	if err != nil {
		return err
	}
	write := func(p redis.Pipeliner) error {
		if overwrite {
			p.Del(ctx, key)
		}
		for _, args := range cmds {
			p.Do(ctx, args...)
		}
		if keepTTL && rec.ttl > 0 {
			p.PExpire(ctx, key, time.Duration(rec.ttl)*time.Millisecond)
		}
		return nil
	}
	if overwrite {
		_, err = rdb.TxPipelined(ctx, write)
		return err
	}
	// WATCH aborts the MULTI if the key appears after the check, so it is never appended to.
	err = rdb.Watch(ctx, func(tx *redis.Tx) error {
		n, err := tx.Exists(ctx, key).Result()
		if err != nil {
			return err
		}
		if n > 0 {
			return errKeyExists
		}
		_, err = tx.TxPipelined(ctx, write)
		return err
	}, key)
	if errors.Is(err, redis.TxFailedErr) {
		return errKeyExists
	}
	return err
}

// Run as each key is read, so Inspect counts a bad key and Import skips it instead of stopping.
func validate(rec loaded) error {
	if len(rec.items) == 0 && !(rec.kind == "stream" && len(rec.groups) > 0) {
		return errors.New("Redis cannot hold an empty " + rec.kind)
	}
	for _, it := range rec.items {
		if e, ok := it.(entry); ok && len(e.fields) == 0 {
			return fmt.Errorf("stream entry %s has no fields", e.id)
		}
	}
	return nil
}

// Built in full before the MULTI opens, so a malformed value writes nothing.
func writeCmds(key string, rec loaded) ([][]any, error) {
	if err := validate(rec); err != nil {
		return nil, err
	}
	chunked := func(cmd string, args []any, width int) [][]any {
		var out [][]any
		for i := 0; i < len(args); i += dumpPage * width {
			end := min(len(args), i+dumpPage*width)
			out = append(out, append([]any{cmd, key}, args[i:end]...))
		}
		return out
	}
	args := make([]any, 0, len(rec.items))
	for _, it := range rec.items {
		switch v := it.(type) {
		case string:
			args = append(args, v)
		case pair:
			args = append(args, v.a, v.b)
		case scored:
			args = append(args, v.score, v.member)
		}
	}

	switch rec.kind {
	case "string":
		return [][]any{{"SET", key, args[0]}}, nil
	case "ReJSON-RL":
		return [][]any{{"JSON.SET", key, "$", string(rec.items[0].(jsonDoc))}}, nil
	case "list":
		return chunked("RPUSH", args, 1), nil
	case "set":
		return chunked("SADD", args, 1), nil
	case "hash":
		return chunked("HSET", args, 2), nil
	case "zset":
		return chunked("ZADD", args, 2), nil
	case "stream":
		out := make([][]any, 0, len(rec.items))
		for _, it := range rec.items {
			e := it.(entry)
			cmd := []any{"XADD", key, e.id}
			for _, f := range e.fields {
				cmd = append(cmd, f.a, f.b)
			}
			out = append(out, cmd)
		}
		for _, g := range rec.groups {
			cmd := []any{"XGROUP", "CREATE", key, g.name, g.id}
			if len(rec.items) == 0 {
				cmd = append(cmd, "MKSTREAM")
			}
			out = append(out, cmd)
		}
		return out, nil
	}
	return nil, unsupportedError{rec.kind}
}
