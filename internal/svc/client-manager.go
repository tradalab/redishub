package svc

import (
	"context"
	"fmt"
	"net"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/tradalab/rdms/internal/model"
	"github.com/tradalab/rdms/internal/types"
	"github.com/tradalab/scorix/netx"
)

type ClientManager struct {
	mu      sync.RWMutex
	clients map[string]*Client

	// Lock order is mu before stateMu; nothing under stateMu takes mu.
	stateMu     sync.Mutex
	states      map[string]types.ClientStateEvent
	retries     map[*Client]time.Time
	onState     func(*types.ClientStateEvent)
	beat        time.Duration
	probeBudget time.Duration
}

func NewManager() *ClientManager {
	return &ClientManager{
		clients:     make(map[string]*Client),
		states:      make(map[string]types.ClientStateEvent),
		retries:     make(map[*Client]time.Time),
		beat:        15 * time.Second,
		probeBudget: 10 * time.Second,
	}
}

func (m *ClientManager) Add(cfg *model.Connection, sshCfg *model.Ssh, proxyCfg *model.Proxy, tlsCfg *model.Tls, dbIdx int) (*Client, error) {
	key := fmt.Sprintf("%s:%d", cfg.ID, dbIdx)

	m.mu.RLock()
	if c, ok := m.clients[key]; ok {
		isStale := false
		if !cfg.UpdatedAt.Equal(c.Cfg.UpdatedAt) {
			isStale = true
		} else if cfg.SshEnable > 0 && sshCfg != nil && c.Ssh != nil && !sshCfg.UpdatedAt.Equal(c.Ssh.UpdatedAt) {
			isStale = true
		} else if cfg.ProxyEnable > 0 && proxyCfg != nil && c.Proxy != nil && !proxyCfg.UpdatedAt.Equal(c.Proxy.UpdatedAt) {
			isStale = true
		} else if cfg.TlsEnable > 0 && tlsCfg != nil && c.Tls != nil && !tlsCfg.UpdatedAt.Equal(c.Tls.UpdatedAt) {
			isStale = true
		}

		if !isStale {
			m.mu.RUnlock()
			ctx, cancel := context.WithTimeout(context.Background(), time.Duration(cfg.DialTimeout)*time.Second)
			err := c.route.VerifyHostKey(ctx)
			cancel()
			if err != nil {
				return nil, err
			}
			return c, nil
		}

		m.mu.RUnlock()
		_ = m.Remove(cfg.ID, dbIdx)
	} else {
		m.mu.RUnlock()
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(cfg.DialTimeout)*time.Second)
	defer cancel()

	m.connecting(cfg.ID)

	rdb, route, err := m.init(ctx, cfg, sshCfg, proxyCfg, tlsCfg, dbIdx)
	if err != nil {
		m.forgetUnused(cfg.ID)
		return nil, err
	}

	cli := NewClient(rdb, cfg, sshCfg, proxyCfg, tlsCfg, dbIdx)
	cli.route = route
	rdb.AddHook(stateHook{m: m, id: cfg.ID})

	if err := rdb.Ping(ctx).Err(); err != nil {
		cli.close()
		m.forgetUnused(cfg.ID)
		return nil, fmt.Errorf("cannot connect to redis %s: %w", cfg.Addr(), err)
	}

	start := time.Now()
	if err := rdb.Do(ctx, "CLIENT", "SETNAME", url.QueryEscape(cfg.Name)).Err(); err == nil {
		m.report(cfg.ID, nil, time.Since(start))
	}

	cli.ReadOnly.Store(cfg.ReadOnly != 0)
	cli.writeCmds = buildWriteCmds(ctx, rdb)
	rdb.AddHook(&readOnlyHook{cli: cli})

	m.mu.Lock()
	defer m.mu.Unlock()

	if c, ok := m.clients[key]; ok {
		cli.close()
		return c, nil
	}

	m.clients[key] = cli
	beat, stop := context.WithCancel(context.Background())
	cli.stopBeat = stop
	go m.heartbeat(beat, cli)

	return cli, nil
}

func (m *ClientManager) init(ctx context.Context, cfg *model.Connection, sshCfg *model.Ssh, proxyCfg *model.Proxy, tlsCfg *model.Tls, dbIdx int) (redis.UniversalClient, *netx.Route, error) {
	options, route, err := m.buildOptions(ctx, cfg, sshCfg, proxyCfg, tlsCfg, dbIdx)
	if err != nil {
		return nil, nil, err
	}
	if err := route.Check(ctx); err != nil {
		_ = route.Close()
		if fe, ok := netx.HostKeyFault(err); ok {
			return nil, nil, fe
		}
		return nil, nil, err
	}

	rdb := redis.NewUniversalClient(options)

	return rdb, route, nil
}

func (m *ClientManager) buildOptions(ctx context.Context, cfg *model.Connection, sshCfg *model.Ssh, proxyCfg *model.Proxy, tlsCfg *model.Tls, dbIdx int) (*redis.UniversalOptions, *netx.Route, error) {
	options := &redis.UniversalOptions{
		Addrs:           []string{cfg.Addr()},
		Username:        cfg.Username,
		Password:        cfg.Password,
		DB:              dbIdx,
		ReadTimeout:     time.Duration(cfg.ExecTimeout) * time.Second,
		WriteTimeout:    time.Duration(cfg.ExecTimeout) * time.Second,
		DialTimeout:     time.Duration(cfg.DialTimeout) * time.Second,
		DisableIdentity: true,
		IdentitySuffix:  "redishub_",
		PoolSize:        10,
	}

	if cfg.SshEnable > 0 && sshCfg == nil {
		return nil, nil, fmt.Errorf("ssh enabled but ssh config missing (caller must pre-load)")
	}
	if cfg.ProxyEnable > 0 && proxyCfg == nil {
		return nil, nil, fmt.Errorf("proxy enabled but proxy config missing (caller must pre-load)")
	}
	if cfg.TlsEnable > 0 && tlsCfg == nil {
		return nil, nil, fmt.Errorf("tls enabled but tls config missing (caller must pre-load)")
	}

	switch cfg.Mode {
	case "sentinel":
		options.MasterName = cfg.SentinelMaster
		options.SentinelUsername = cfg.SentinelUsername
		options.SentinelPassword = cfg.SentinelPassword
		options.Addrs = strings.FieldsFunc(cfg.Addrs, func(r rune) bool {
			return r == ',' || r == '\n' || r == '\r' || r == ' ' || r == '\t' || r == ';'
		})
		if len(options.Addrs) == 0 {
			options.Addrs = []string{net.JoinHostPort(cfg.Host, strconv.Itoa(int(cfg.Port)))}
		}
	case "cluster":
		options.Addrs = strings.FieldsFunc(cfg.Addrs, func(r rune) bool {
			return r == ',' || r == '\n' || r == '\r' || r == ' ' || r == '\t' || r == ';'
		})
		if len(options.Addrs) == 0 {
			options.Addrs = []string{net.JoinHostPort(cfg.Host, strconv.Itoa(int(cfg.Port)))}
		}
	default:
		switch cfg.Network {
		case "unix":
			if len(cfg.Sock) <= 0 {
				options.Addrs = []string{"/tmp/redis.sock"}
			} else {
				options.Addrs = []string{cfg.Sock}
			}
		case "tcp":
		default:
			return nil, nil, fmt.Errorf("unknown network type: %s", cfg.Network)
		}
	}

	var cleanAddrs []string
	for _, addr := range options.Addrs {
		addr = strings.TrimSpace(addr)
		if addr != "" {
			cleanAddrs = append(cleanAddrs, addr)
		}
	}
	options.Addrs = cleanAddrs

	if (cfg.Mode == "cluster" || cfg.Mode == "sentinel") && len(options.Addrs) == 0 {
		options.Addrs = []string{cfg.Addr()}
	}

	route, err := buildRoute(options.DialTimeout, lenientAddrMap(cfg.AddrMapping), cfg, sshCfg, proxyCfg)
	if err != nil {
		return nil, nil, err
	}
	options.Dialer = route.Dial

	if cfg.TlsEnable > 0 && tlsCfg != nil {
		tlsConfig, err := tlsCfg.BuildTlsConfig()
		if err != nil {
			_ = route.Close()
			return nil, nil, fmt.Errorf("tls build failed: %w", err)
		}
		options.TLSConfig = tlsConfig
	}

	return options, route, nil
}

func buildRoute(timeout time.Duration, addrMap map[string]string, cfg *model.Connection, sshCfg *model.Ssh, proxyCfg *model.Proxy) (*netx.Route, error) {
	rc := netx.Config{Timeout: timeout, AddrMap: addrMap}
	if cfg.ProxyEnable > 0 && proxyCfg != nil {
		rc.Proxy = &netx.Proxy{Protocol: proxyCfg.Protocol, Addr: proxyCfg.Addr(), Username: proxyCfg.Username, Password: proxyCfg.Password}
	}
	if cfg.SshEnable > 0 {
		s, err := sshCfg.Netx()
		if err != nil {
			return nil, err
		}
		rc.SSH = s
	}
	return netx.Open(rc)
}

func (m *ClientManager) Test(cfg *model.Connection, sshCfg *model.Ssh, proxyCfg *model.Proxy, tlsCfg *model.Tls, dbIdx int) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(cfg.DialTimeout)*time.Second)
	defer cancel()

	rdb, route, err := m.init(ctx, cfg, sshCfg, proxyCfg, tlsCfg, dbIdx)
	if err != nil {
		return err
	}
	defer route.Close()
	defer rdb.Close()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("cannot connect to redis %s: %w", cfg.Addr(), err)
	}

	return nil
}

func (m *ClientManager) Get(id string, dbIdx int) (*Client, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	key := fmt.Sprintf("%s:%d", id, dbIdx)

	if c, ok := m.clients[key]; ok {
		return c, nil
	}

	return nil, fmt.Errorf("client %s not found", key)
}

func (m *ClientManager) SetReadOnly(id string, ro bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	prefix := id + ":"
	for key, c := range m.clients {
		if strings.HasPrefix(key, prefix) {
			c.ReadOnly.Store(ro)
		}
	}
}

func (m *ClientManager) Remove(id string, dbIdx int) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	key := fmt.Sprintf("%s:%d", id, dbIdx)

	if c, ok := m.clients[key]; ok {
		c.close()
		delete(m.clients, key)
		if !m.openLocked(id) {
			m.forget(id)
		}
		return nil
	}
	return fmt.Errorf("client %s not found", key)
}

func (m *ClientManager) RemoveConnection(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	prefix := id + ":"
	for key, c := range m.clients {
		if strings.HasPrefix(key, prefix) {
			c.close()
			delete(m.clients, key)
		}
	}
	m.forget(id)
}

func (m *ClientManager) CloseAll() {
	m.mu.Lock()
	defer m.mu.Unlock()
	for key, c := range m.clients {
		c.close()
		delete(m.clients, key)
		m.forget(c.Cfg.ID)
	}
}

func (m *ClientManager) Do(ctx context.Context, id string, dbIdx int, args ...interface{}) (interface{}, error) {
	c, err := m.Get(id, dbIdx)
	if err != nil {
		return nil, err
	}
	return c.Rdb.Do(ctx, args...).Result()
}

func lenientAddrMap(s string) map[string]string {
	out := map[string]string{}
	for line := range strings.SplitSeq(s, "\n") {
		k, v, ok := strings.Cut(line, "=")
		k, v = strings.TrimSpace(k), strings.TrimSpace(v)
		if ok && k != "" && v != "" {
			out[k] = v
		}
	}
	return out
}
