package connection

import (
	"context"
	"net"
	"strconv"
	"testing"

	"github.com/alicebob/miniredis/v2"

	"github.com/tradalab/rdms/internal/types"
)

func TestDeleteClosesOpenClients(t *testing.T) {
	ctx := context.Background()
	sc := migratedContext(t)
	t.Cleanup(sc.RedisManager.CloseAll)

	s := miniredis.RunT(t)
	host, portStr, _ := net.SplitHostPort(s.Addr())
	port, _ := strconv.Atoi(portStr)
	req := &types.ConnectionReq{Id: "c1", Name: "prod", Mode: "standalone", Network: "tcp", Host: host, Port: int32(port), DialTimeout: 5, ExecTimeout: 5}
	if _, err := NewUpsertLogic(ctx, sc).Upsert(req); err != nil {
		t.Fatal(err)
	}
	cfg, err := sc.ConnectionModel.FindOne(ctx, "c1")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := sc.RedisManager.Add(cfg, nil, nil, nil, 0); err != nil {
		t.Fatalf("open: %v", err)
	}

	if _, err := NewDeleteLogic(ctx, sc).Delete(&types.IdReq{Id: "c1"}); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, err := sc.RedisManager.Get("c1", 0); err == nil {
		t.Fatal("the deleted connection still has an open client")
	}
}
