package svc

import (
	"context"
	"net"
	"sync"
	"testing"

	"github.com/redis/go-redis/v9"
)

type argsRecorder struct {
	mu   sync.Mutex
	sent [][]interface{}
}

func (r *argsRecorder) DialHook(next redis.DialHook) redis.DialHook {
	return func(ctx context.Context, network, addr string) (net.Conn, error) { return next(ctx, network, addr) }
}

func (r *argsRecorder) ProcessHook(next redis.ProcessHook) redis.ProcessHook {
	return func(ctx context.Context, cmd redis.Cmder) error {
		r.mu.Lock()
		r.sent = append(r.sent, cmd.Args())
		r.mu.Unlock()
		return next(ctx, cmd)
	}
}

func (r *argsRecorder) ProcessPipelineHook(next redis.ProcessPipelineHook) redis.ProcessPipelineHook {
	return next
}

func TestProbeTagsItsPing(t *testing.T) {
	_, cfg := newMiniredis(t)
	m := NewManager()
	t.Cleanup(m.CloseAll)
	c, err := m.Add(cfg, nil, nil, nil, 0)
	if err != nil {
		t.Fatalf("Add: %v", err)
	}
	rec := &argsRecorder{}
	c.Rdb.AddHook(rec)

	if err := m.probe(context.Background(), c); err != nil {
		t.Fatalf("probe: %v", err)
	}

	rec.mu.Lock()
	defer rec.mu.Unlock()
	if len(rec.sent) != 1 || len(rec.sent[0]) != 2 || rec.sent[0][0] != "PING" || rec.sent[0][1] != HeartbeatToken {
		t.Fatalf("probe sent %v, want [[PING %s]]", rec.sent, HeartbeatToken)
	}
}
