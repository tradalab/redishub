package analysis

import (
	"sort"
	"strings"

	"github.com/tradalab/rdms/internal/types"
)

const (
	defaultDelimiter = ":"
	prefixMaxDepth   = 3
	// Per level, so id segments ("user:<id>:x") cannot crowd out top-level prefixes.
	prefixMaxTracked = 50000
)

// Children kept per parent; dropped ones still count in the parent's total.
var prefixEmitLimit = [prefixMaxDepth]int{20, 10, 5}

type prefixStat struct {
	keys  int64
	bytes int64
}

type prefixTree struct {
	delim  string
	levels [prefixMaxDepth]map[string]*prefixStat
	capped bool
}

func newPrefixTree(delim string) *prefixTree {
	if delim == "" {
		delim = defaultDelimiter
	}
	t := &prefixTree{delim: delim}
	for i := range t.levels {
		t.levels[i] = map[string]*prefixStat{}
	}
	return t
}

// The last segment is the key name: "a:b:c" counts toward "a" and "a:b" only.
func (t *prefixTree) add(key string, size int64) {
	end := 0
	for d := 0; d < prefixMaxDepth; d++ {
		i := strings.Index(key[end:], t.delim)
		if i < 0 {
			return
		}
		end += i
		path := key[:end]
		end += len(t.delim)

		stat, ok := t.levels[d][path]
		if !ok {
			if len(t.levels[d]) >= prefixMaxTracked {
				t.capped = true
				return
			}
			stat = &prefixStat{}
			t.levels[d][path] = stat
		}
		stat.keys++
		stat.bytes += size
	}
}

func (t *prefixTree) emit() []types.AnalysisPrefix {
	out := []types.AnalysisPrefix{}
	parents := map[string]bool{"": true}
	for d := 0; d < prefixMaxDepth; d++ {
		byParent := map[string][]types.AnalysisPrefix{}
		for path, stat := range t.levels[d] {
			parent := ""
			if d > 0 {
				parent = path[:strings.LastIndex(path, t.delim)]
			}
			if parents[parent] {
				byParent[parent] = append(byParent[parent], types.AnalysisPrefix{Prefix: path, Depth: int32(d + 1), Keys: stat.keys, Bytes: stat.bytes})
			}
		}
		next := map[string]bool{}
		for _, children := range byParent {
			sort.Slice(children, func(i, j int) bool {
				if children[i].Bytes != children[j].Bytes {
					return children[i].Bytes > children[j].Bytes
				}
				return children[i].Prefix < children[j].Prefix
			})
			for _, c := range children[:min(len(children), prefixEmitLimit[d])] {
				out = append(out, c)
				next[c.Prefix] = true
			}
		}
		parents = next
	}
	return out
}
