package svc

import (
	"context"
	"testing"

	"github.com/tradalab/rdms/internal/model"
)

func TestClientManager_BuildOptions(t *testing.T) {
	m := NewManager()

	t.Run("Sentinel", func(t *testing.T) {
		cfg := &model.Connection{
			Mode:             "sentinel",
			SentinelMaster:   "mymaster",
			Addrs:            "127.0.0.1:26379, 127.0.0.1:26380\n127.0.0.1:26381",
			SentinelUsername: "sentinel_user",
			SentinelPassword: "sentinel_pass",
			Username:         "redis_user",
			Password:         "redis_pass",
		}
		opts, err := m.buildOptions(context.TODO(), cfg, nil, nil, nil, 1)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if opts.MasterName != "mymaster" {
			t.Errorf("expected mymaster, got %s", opts.MasterName)
		}
		expectedAddrs := []string{"127.0.0.1:26379", "127.0.0.1:26380", "127.0.0.1:26381"}
		if len(opts.Addrs) != 3 {
			t.Fatalf("expected 3 addrs, got %d", len(opts.Addrs))
		}
		for i, addr := range expectedAddrs {
			if opts.Addrs[i] != addr {
				t.Errorf("expected %s at index %d, got %s", addr, i, opts.Addrs[i])
			}
		}
		if opts.SentinelUsername != "sentinel_user" {
			t.Errorf("expected sentinel_user, got %s", opts.SentinelUsername)
		}
		if opts.SentinelPassword != "sentinel_pass" {
			t.Errorf("expected sentinel_pass, got %s", opts.SentinelPassword)
		}
		if opts.Username != "redis_user" {
			t.Errorf("expected redis_user, got %s", opts.Username)
		}
		if opts.Password != "redis_pass" {
			t.Errorf("expected redis_pass, got %s", opts.Password)
		}
		if opts.DB != 1 {
			t.Errorf("expected DB 1, got %d", opts.DB)
		}
	})

	t.Run("Cluster", func(t *testing.T) {
		cfg := &model.Connection{
			Mode:  "cluster",
			Addrs: "127.0.0.1:7000,127.0.0.1:7001",
		}
		opts, err := m.buildOptions(context.TODO(), cfg, nil, nil, nil, 0)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		expectedAddrs := []string{"127.0.0.1:7000", "127.0.0.1:7001"}
		if len(opts.Addrs) != 2 {
			t.Fatalf("expected 2 addrs, got %d", len(opts.Addrs))
		}
		for i, addr := range expectedAddrs {
			if opts.Addrs[i] != addr {
				t.Errorf("expected %s at index %d, got %s", addr, i, opts.Addrs[i])
			}
		}
	})
}
