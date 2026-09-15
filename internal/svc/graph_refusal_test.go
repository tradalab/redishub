package svc

import (
	"errors"
	"testing"

	"github.com/tradalab/scorix/fault"
)

// Captured from redis:8 with only bloom loaded, and from redislabs/redisgraph:2.0.20.
const (
	refusedQuery         = `ERR unknown command 'GRAPH.QUERY', with args beginning with: 'g' 'MATCH (n) RETURN n' `
	refusedROQuery       = `ERR unknown command 'GRAPH.RO_QUERY', with args beginning with: 'g' 'MATCH (n) RETURN n' `
	refusedROQueryLegacy = "ERR unknown command `GRAPH.RO_QUERY`, with args beginning with: `demo:social`, `MATCH (n) RETURN count(n)`, "
)

func probe(known bool, err error, calls *int) func() (bool, error) {
	return func() (bool, error) {
		*calls++
		return known, err
	}
}

func TestClassifyGraphErr(t *testing.T) {
	probeFailed := errors.New("i/o timeout")

	cases := []struct {
		name       string
		err        error
		cmd        string
		known      bool
		probeErr   error
		wantCode   string
		wantProbed bool
	}{
		{"writable, no module", errors.New(refusedQuery), "GRAPH.QUERY", true, nil, CodeGraphModuleMissing, false},
		{"read-only, no module", errors.New(refusedROQuery), "GRAPH.RO_QUERY", false, nil, CodeGraphModuleMissing, true},
		{"read-only, module without RO twin", errors.New(refusedROQuery), "GRAPH.RO_QUERY", true, nil, CodeGraphROUnsupported, true},
		{"read-only, legacy server quoting", errors.New(refusedROQueryLegacy), "GRAPH.RO_QUERY", true, nil, CodeGraphROUnsupported, true},
		{"read-only, probe failed", errors.New(refusedROQuery), "GRAPH.RO_QUERY", false, probeFailed, "", true},
		{"cypher error", errors.New("errMsg: Invalid input 'X': expected a Cypher statement"), "GRAPH.QUERY", true, nil, "", false},
	}

	for _, c := range cases {
		calls := 0
		got := classifyGraphErr(c.err, c.cmd, probe(c.known, c.probeErr, &calls))
		if code := fault.CodeOf(got); code != c.wantCode {
			t.Errorf("%s: code %q, want %q", c.name, code, c.wantCode)
		}
		if c.wantCode == "" && got != c.err {
			t.Errorf("%s: error rewritten to %v", c.name, got)
		}
		if probed := calls > 0; probed != c.wantProbed {
			t.Errorf("%s: probed=%v, want %v", c.name, probed, c.wantProbed)
		}
	}

	if classifyGraphErr(nil, "GRAPH.QUERY", nil) != nil {
		t.Error("nil became an error")
	}
}
