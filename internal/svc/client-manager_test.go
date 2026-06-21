package svc

import (
	"context"
	"net"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
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

	t.Run("DialerAlwaysSet", func(t *testing.T) {
		cfg := &model.Connection{Mode: "standalone", Network: "tcp", Host: "127.0.0.1", Port: 6379}
		opts, err := m.buildOptions(context.TODO(), cfg, nil, nil, nil, 0)
		if err != nil {
			t.Fatal(err)
		}
		if opts.Dialer == nil {
			t.Fatal("expected a custom Dialer to be installed")
		}
	})

	t.Run("EnabledButMissingConfig", func(t *testing.T) {
		cases := []struct {
			name string
			cfg  *model.Connection
		}{
			{"ssh", &model.Connection{Network: "tcp", SshEnable: 1}},
			{"proxy", &model.Connection{Network: "tcp", ProxyEnable: 1}},
			{"tls", &model.Connection{Network: "tcp", TlsEnable: 1}},
		}
		for _, tc := range cases {
			if _, err := m.buildOptions(context.TODO(), tc.cfg, nil, nil, nil, 0); err == nil {
				t.Errorf("%s enabled with nil config must error", tc.name)
			}
		}
	})

	t.Run("SSHTunnelOptions", func(t *testing.T) {
		cfg := &model.Connection{Network: "tcp", Host: "10.0.0.5", Port: 6379, SshEnable: 1}
		ssh := &model.Ssh{Host: "bastion", Port: 22, Username: "u", Kind: "password", Password: "p"}
		opts, err := m.buildOptions(context.TODO(), cfg, ssh, nil, nil, 0)
		if err != nil {
			t.Skipf("ssh build returned %v (no bastion in unit env) — option-shape check skipped", err)
		}
		if opts.Protocol != 2 {
			t.Errorf("ssh must force RESP2, got protocol %d", opts.Protocol)
		}
		if opts.ReadTimeout != -1 || opts.WriteTimeout != -1 {
			t.Errorf("ssh must disable go-redis r/w deadlines, got r=%v w=%v", opts.ReadTimeout, opts.WriteTimeout)
		}
	})

	t.Run("TLSConfigBuilt", func(t *testing.T) {
		cfg := &model.Connection{Network: "tcp", Host: "127.0.0.1", Port: 6379, TlsEnable: 1}
		tls := &model.Tls{Verify: 0}
		opts, err := m.buildOptions(context.TODO(), cfg, nil, nil, tls, 0)
		if err != nil {
			t.Fatalf("tls build: %v", err)
		}
		if opts.TLSConfig == nil {
			t.Fatal("expected TLSConfig to be set when tls enabled")
		}
		if !opts.TLSConfig.InsecureSkipVerify {
			t.Error("Verify=0 should yield InsecureSkipVerify=true")
		}
	})

	t.Run("AddrMappingParsed", func(t *testing.T) {
		cfg := &model.Connection{
			Mode: "standalone", Network: "tcp", Host: "127.0.0.1", Port: 6379,
			AddrMapping: "10.0.0.1:6379=1.2.3.4:6379\nbad-line-no-eq",
		}
		if _, err := m.buildOptions(context.TODO(), cfg, nil, nil, nil, 0); err != nil {
			t.Fatalf("addr mapping must parse leniently, got %v", err)
		}
	})
}

func newMiniredis(t *testing.T) (*miniredis.Miniredis, *model.Connection) {
	t.Helper()
	s := miniredis.RunT(t)
	host, portStr, _ := net.SplitHostPort(s.Addr())
	port, _ := parsePort(portStr)
	return s, &model.Connection{
		ID:          "conn-1",
		Mode:        "standalone",
		Network:     "tcp",
		Host:        host,
		Port:        port,
		DialTimeout: 5,
		ExecTimeout: 5,
		UpdatedAt:   time.Now(),
	}
}

func parsePort(s string) (int64, error) {
	var p int64
	for _, r := range s {
		p = p*10 + int64(r-'0')
	}
	return p, nil
}

func TestClientManager_Lifecycle(t *testing.T) {
	_, cfg := newMiniredis(t)
	m := NewManager()

	c, err := m.Add(cfg, nil, nil, nil, 0)
	if err != nil {
		t.Fatalf("Add: %v", err)
	}
	if c == nil {
		t.Fatal("Add returned nil client")
	}

	got, err := m.Get(cfg.ID, 0)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got != c {
		t.Error("Get returned a different instance than Add cached")
	}

	c2, err := m.Add(cfg, nil, nil, nil, 0)
	if err != nil {
		t.Fatalf("re-Add: %v", err)
	}
	if c2 != c {
		t.Error("re-Add with unchanged config must reuse the cached client")
	}

	if err := m.Remove(cfg.ID, 0); err != nil {
		t.Fatalf("Remove: %v", err)
	}
	if _, err := m.Get(cfg.ID, 0); err == nil {
		t.Error("Get after Remove must fail")
	}
	if err := m.Remove(cfg.ID, 0); err == nil {
		t.Error("double Remove must report not-found")
	}
}

func TestClientManager_StaleInvalidation(t *testing.T) {
	_, cfg := newMiniredis(t)
	m := NewManager()

	c1, err := m.Add(cfg, nil, nil, nil, 0)
	if err != nil {
		t.Fatalf("Add: %v", err)
	}

	newer := *cfg
	newer.UpdatedAt = cfg.UpdatedAt.Add(time.Second)
	c2, err := m.Add(&newer, nil, nil, nil, 0)
	if err != nil {
		t.Fatalf("re-Add (stale): %v", err)
	}
	if c2 == c1 {
		t.Error("a changed UpdatedAt must invalidate and rebuild the client")
	}
}

func TestClientManager_CloseAll(t *testing.T) {
	_, cfg := newMiniredis(t)
	m := NewManager()
	if _, err := m.Add(cfg, nil, nil, nil, 0); err != nil {
		t.Fatalf("Add: %v", err)
	}
	m.CloseAll()
	if _, err := m.Get(cfg.ID, 0); err == nil {
		t.Error("CloseAll must drop every client")
	}
}
