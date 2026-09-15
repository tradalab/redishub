package client

import (
	"context"
	"net"
	"strconv"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/tradalab/rdms/internal/model"
	"github.com/tradalab/rdms/internal/svc"
	"github.com/tradalab/rdms/internal/types"
)

func TestDisconnectClosesEveryDatabase(t *testing.T) {
	s := miniredis.RunT(t)
	host, portStr, _ := net.SplitHostPort(s.Addr())
	port, _ := strconv.ParseInt(portStr, 10, 64)
	cfg := &model.Connection{ID: "c1", Mode: "standalone", Network: "tcp", Host: host, Port: port, DialTimeout: 5, ExecTimeout: 5, UpdatedAt: time.Now()}

	svcCtx := &svc.ServiceContext{RedisManager: svc.NewManager()}
	for _, db := range []int{0, 3} {
		if _, err := svcCtx.RedisManager.Add(cfg, nil, nil, nil, db); err != nil {
			t.Fatalf("Add db %d: %v", db, err)
		}
	}

	if _, err := NewDisconnectLogic(context.Background(), svcCtx).Disconnect(&types.ClientDisconnectReq{ConnectionId: "c1"}); err != nil {
		t.Fatalf("Disconnect: %v", err)
	}
	for _, db := range []int{0, 3} {
		if _, err := svcCtx.RedisManager.Get("c1", db); err == nil {
			t.Errorf("db %d still open after Disconnect", db)
		}
	}
}

func TestDisconnectOfUnopenedConnectionSucceeds(t *testing.T) {
	svcCtx := &svc.ServiceContext{RedisManager: svc.NewManager()}
	if _, err := NewDisconnectLogic(context.Background(), svcCtx).Disconnect(&types.ClientDisconnectReq{ConnectionId: "never-opened"}); err != nil {
		t.Fatalf("Disconnect of a connection with nothing open: %v", err)
	}
}
