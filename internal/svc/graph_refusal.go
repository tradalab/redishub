package svc

import (
	"context"
	"strings"

	"github.com/redis/go-redis/v9"
	"github.com/tradalab/scorix/fault"
)

const (
	CodeGraphModuleMissing = "graph_module_missing"
	CodeGraphROUnsupported = "graph_ro_unsupported"
)

func (c *Client) ClassifyGraphErr(ctx context.Context, err error, cmd string) error {
	return classifyGraphErr(err, cmd, func() (bool, error) { return graphQueryKnown(ctx, c.Rdb) })
}

// A server without the module refuses GRAPH.RO_QUERY in the same words as a module
// too old for the RO twin, so that refusal alone cannot say which. The probe is
// COMMAND INFO because the read-only hook would block GRAPH.QUERY itself.
func classifyGraphErr(err error, cmd string, queryKnown func() (bool, error)) error {
	if err == nil || !refusedCommand(err.Error(), cmd) {
		return err
	}
	if cmd == "GRAPH.RO_QUERY" {
		known, probeErr := queryKnown()
		if probeErr != nil {
			return err
		}
		if known {
			return fault.New(CodeGraphROUnsupported, "this server has the graph module but not GRAPH.RO_QUERY")
		}
	}
	return fault.New(CodeGraphModuleMissing, "this server has no graph module")
}

// Redis 6.0.6 quotes the name with backticks, redis:8 with single quotes.
func refusedCommand(msg, cmd string) bool {
	return strings.Contains(msg, "unknown command '"+cmd+"'") || strings.Contains(msg, "unknown command `"+cmd+"`")
}

// A command the server lacks comes back as a single nil entry.
func graphQueryKnown(ctx context.Context, rdb redis.UniversalClient) (bool, error) {
	info, err := rdb.Do(ctx, "COMMAND", "INFO", "GRAPH.QUERY").Slice()
	if err != nil {
		return false, err
	}
	return len(info) > 0 && info[0] != nil, nil
}
