package analysis

import (
	"fmt"
	"testing"

	"github.com/tradalab/rdms/internal/types"
)

func byPrefix(items []types.AnalysisPrefix) map[string]types.AnalysisPrefix {
	m := map[string]types.AnalysisPrefix{}
	for _, p := range items {
		m[p.Prefix] = p
	}
	return m
}

func TestPrefixTreeCountsEveryAncestorButNotTheKeyName(t *testing.T) {
	tree := newPrefixTree("")
	tree.add("user:1:profile", 100)
	tree.add("user:1:cart", 50)
	tree.add("user:2", 10)
	tree.add("session:abc", 7)
	tree.add("plain", 999)

	got := byPrefix(tree.emit())
	want := map[string]types.AnalysisPrefix{
		"user":    {Prefix: "user", Depth: 1, Keys: 3, Bytes: 160},
		"user:1":  {Prefix: "user:1", Depth: 2, Keys: 2, Bytes: 150},
		"session": {Prefix: "session", Depth: 1, Keys: 1, Bytes: 7},
	}
	if len(got) != len(want) {
		t.Fatalf("got %d prefixes, want %d: %+v", len(got), len(want), got)
	}
	for k, w := range want {
		if got[k] != w {
			t.Errorf("%s = %+v, want %+v", k, got[k], w)
		}
	}
}

func TestPrefixTreeStopsAtMaxDepth(t *testing.T) {
	tree := newPrefixTree("/")
	tree.add("a/b/c/d/e/f", 1)
	got := byPrefix(tree.emit())
	if _, ok := got["a/b/c"]; !ok || len(got) != prefixMaxDepth {
		t.Fatalf("want a, a/b, a/b/c only: %+v", got)
	}
}

func TestPrefixTreeEmitKeepsLargestChildrenOfKeptParents(t *testing.T) {
	tree := newPrefixTree(":")
	for i := 0; i < prefixEmitLimit[0]+5; i++ {
		tree.add(fmt.Sprintf("p%02d:x", i), int64(i+1))
	}
	tree.add("p00:child:x", 1)

	got := byPrefix(tree.emit())
	if len(got) != prefixEmitLimit[0] {
		t.Fatalf("emitted %d top-level prefixes, want %d", len(got), prefixEmitLimit[0])
	}
	if _, ok := got["p00"]; ok {
		t.Fatal("smallest prefix should be dropped")
	}
	if _, ok := got["p00:child"]; ok {
		t.Fatal("child of a dropped parent should not be emitted")
	}
}

func TestPrefixTreeCapKeepsAncestorTotals(t *testing.T) {
	tree := newPrefixTree(":")
	for i := 0; i < prefixMaxTracked+10; i++ {
		tree.add(fmt.Sprintf("user:%d:x", i), 1)
	}
	if !tree.capped {
		t.Fatal("want capped")
	}
	if got := tree.levels[0]["user"]; got.keys != prefixMaxTracked+10 {
		t.Fatalf("user counted %d keys, want every key", got.keys)
	}
}

func TestPrefixTreeCapIsPerLevel(t *testing.T) {
	tree := newPrefixTree(":")
	for i := 0; i < prefixMaxTracked+10; i++ {
		tree.add(fmt.Sprintf("user:%d:x", i), 1)
	}
	tree.add("order:1", 5)
	if got := tree.levels[0]["order"]; got == nil || got.keys != 1 {
		t.Fatalf("top-level prefix after the cap was dropped: %+v", got)
	}
}
