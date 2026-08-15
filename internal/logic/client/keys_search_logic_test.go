package client

import (
	"context"
	"fmt"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"

	"github.com/tradalab/rdms/internal/types"
	"github.com/tradalab/rdms/pkg/keyfilter"
)

func collect(t *testing.T, rdb redis.UniversalClient, clauses []keyfilter.Clause, matchAll bool, opts searchOptions) ([]string, *types.ClientKeysSearchEvent) {
	t.Helper()

	filter, err := keyfilter.Compile(clauses, matchAll)
	if err != nil {
		t.Fatalf("Compile: %v", err)
	}
	if opts.match == "" {
		opts.match = filter.Pushdown()
	}

	var (
		keys []string
		last *types.ClientKeysSearchEvent
	)
	err = scanFiltered(context.Background(), rdb, filter, opts, func(ev *types.ClientKeysSearchEvent) error {
		keys = append(keys, ev.Keys...)
		cp := *ev
		last = &cp
		return nil
	})
	if err != nil {
		t.Fatalf("scanFiltered: %v", err)
	}
	if last == nil {
		t.Fatal("no event was emitted; the stream must always end with a done event")
	}
	if !last.Done {
		t.Error("the final event is not marked done")
	}
	return keys, last
}

func newRedis(t *testing.T) (*miniredis.Miniredis, redis.UniversalClient) {
	t.Helper()
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	return mr, rdb
}

func TestScanFilteredFindsEveryMatch(t *testing.T) {
	mr, rdb := newRedis(t)

	for i := range 500 {
		mr.Set(fmt.Sprintf("user:%d", i), "v")
	}
	for i := range 500 {
		mr.Set(fmt.Sprintf("session:%d", i), "v")
	}
	mr.Set("user:admin", "v")

	keys, last := collect(t, rdb, []keyfilter.Clause{{Pattern: "user:*"}}, false, searchOptions{scanCount: 50})

	if len(keys) != 501 {
		t.Errorf("got %d keys, want 501", len(keys))
	}
	if last.Truncated {
		t.Error("a complete scan must not report truncation")
	}
	if last.Matched != 501 {
		t.Errorf("matched counter = %d, want 501", last.Matched)
	}
}

func TestScanFilteredHandlesFiltersRedisCannot(t *testing.T) {
	mr, rdb := newRedis(t)

	mr.Set("user:1", "v")
	mr.Set("user:22", "v")
	mr.Set("user:abc", "v")
	mr.Set("USER:9", "v")
	mr.Set("order:1", "v")
	mr.Set("user:1:tmp", "v")

	t.Run("regex", func(t *testing.T) {
		keys, _ := collect(t, rdb, []keyfilter.Clause{
			{Pattern: `^user:\d+$`, Mode: keyfilter.ModeRegex},
		}, false, searchOptions{})
		assertSameKeys(t, keys, []string{"user:1", "user:22"})
	})

	t.Run("ignore case", func(t *testing.T) {
		keys, _ := collect(t, rdb, []keyfilter.Clause{
			{Pattern: "user:9", IgnoreCase: true},
		}, false, searchOptions{})
		assertSameKeys(t, keys, []string{"USER:9"})
	})

	t.Run("include OR include", func(t *testing.T) {
		keys, _ := collect(t, rdb, []keyfilter.Clause{
			{Pattern: "order:*"},
			{Pattern: "user:abc"},
		}, false, searchOptions{})
		assertSameKeys(t, keys, []string{"order:1", "user:abc"})
	})

	t.Run("include minus exclude", func(t *testing.T) {
		keys, _ := collect(t, rdb, []keyfilter.Clause{
			{Pattern: "user:*"},
			{Pattern: "*:tmp", Exclude: true},
		}, false, searchOptions{})
		assertSameKeys(t, keys, []string{"user:1", "user:22", "user:abc"})
	})
}

func TestScanFilteredStopsAtLimit(t *testing.T) {
	mr, rdb := newRedis(t)
	for i := range 300 {
		mr.Set(fmt.Sprintf("k:%d", i), "v")
	}

	keys, last := collect(t, rdb, nil, false, searchOptions{limit: 50, scanCount: 10})

	if !last.Truncated {
		t.Error("hitting the limit must set truncated")
	}
	if len(keys) < 50 {
		t.Errorf("got %d keys, want at least the limit of 50", len(keys))
	}
	if last.Cursor != "0" {
		t.Errorf("cursor = %q, want the start of the truncated round", last.Cursor)
	}
}

func TestScanFilteredStopsWhenClientGoesAway(t *testing.T) {
	mr, rdb := newRedis(t)
	for i := range 2000 {
		mr.Set(fmt.Sprintf("k:%d", i), "v")
	}

	filter, err := keyfilter.Compile(nil, false)
	if err != nil {
		t.Fatalf("Compile: %v", err)
	}

	sent := 0
	wantErr := fmt.Errorf("client gone")
	err = scanFiltered(context.Background(), rdb, filter, searchOptions{scanCount: 10, limit: 100000},
		func(*types.ClientKeysSearchEvent) error {
			sent++
			return wantErr
		})

	if err == nil {
		t.Fatal("scanFiltered kept going after the sink reported the client was gone")
	}
	if sent != 1 {
		t.Errorf("emitted %d times after the first failure, want 1", sent)
	}
}

func assertSameKeys(t *testing.T, got, want []string) {
	t.Helper()
	if len(got) != len(want) {
		t.Fatalf("got %v, want %v", got, want)
	}
	seen := make(map[string]bool, len(got))
	for _, k := range got {
		seen[k] = true
	}
	for _, k := range want {
		if !seen[k] {
			t.Errorf("missing %q from %v", k, got)
		}
	}
}
