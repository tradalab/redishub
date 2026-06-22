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
	"github.com/tradalab/rdms/pkg/netx"
	"golang.org/x/crypto/ssh"
	"golang.org/x/net/proxy"
)

type ClientManager struct {
	mu      sync.RWMutex
	clients map[string]*Client
}

func NewManager() *ClientManager {
	return &ClientManager{
		clients: make(map[string]*Client),
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
			return c, nil
		}

		m.mu.RUnlock()
		_ = m.Remove(cfg.ID, dbIdx)
	} else {
		m.mu.RUnlock()
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(cfg.DialTimeout)*time.Second)
	defer cancel()

	rdb, err := m.init(ctx, cfg, sshCfg, proxyCfg, tlsCfg, dbIdx)
	if err != nil {
		return nil, err
	}

	if err := rdb.Ping(ctx).Err(); err != nil {
		rdb.Close()
		return nil, fmt.Errorf("cannot connect to redis %s: %w", cfg.Addr(), err)
	}

	_ = rdb.Do(ctx, "CLIENT", "SETNAME", url.QueryEscape(cfg.Name)).Err()

	cli := NewClient(rdb, cfg, sshCfg, proxyCfg, tlsCfg, dbIdx)
	cli.ReadOnly.Store(cfg.ReadOnly != 0)
	cli.writeCmds = buildWriteCmds(ctx, rdb)
	rdb.AddHook(&readOnlyHook{cli: cli})

	m.mu.Lock()
	defer m.mu.Unlock()

	if c, ok := m.clients[key]; ok {
		rdb.Close()
		return c, nil
	}

	m.clients[key] = cli

	return cli, nil
}

func (m *ClientManager) init(ctx context.Context, cfg *model.Connection, sshCfg *model.Ssh, proxyCfg *model.Proxy, tlsCfg *model.Tls, dbIdx int) (redis.UniversalClient, error) {
	options, err := m.buildOptions(ctx, cfg, sshCfg, proxyCfg, tlsCfg, dbIdx)
	if err != nil {
		return nil, err
	}

	rdb := redis.NewUniversalClient(options)

	return rdb, nil
}

func (m *ClientManager) buildOptions(ctx context.Context, cfg *model.Connection, sshCfg *model.Ssh, proxyCfg *model.Proxy, tlsCfg *model.Tls, dbIdx int) (*redis.UniversalOptions, error) {
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

	if cfg.SshEnable > 0 {
		options.Protocol = 2
		options.ReadTimeout = -1
		options.WriteTimeout = -1
	}

	if cfg.SshEnable > 0 && sshCfg == nil {
		return nil, fmt.Errorf("ssh enabled but ssh config missing (caller must pre-load)")
	}
	if cfg.ProxyEnable > 0 && proxyCfg == nil {
		return nil, fmt.Errorf("proxy enabled but proxy config missing (caller must pre-load)")
	}
	if cfg.TlsEnable > 0 && tlsCfg == nil {
		return nil, fmt.Errorf("tls enabled but tls config missing (caller must pre-load)")
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
			return nil, fmt.Errorf("unknown network type: %s", cfg.Network)
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

	addrMap := make(map[string]string)
	if cfg.AddrMapping != "" {
		lines := append([]string{}, netx.SplitLines(cfg.AddrMapping)...)
		for _, line := range lines {
			if kv := netx.SplitKV(line, "="); len(kv) == 2 {
				addrMap[kv[0]] = kv[1]
			}
		}
	}

	var baseDialer interface {
		DialContext(ctx context.Context, network, addr string) (net.Conn, error)
	}

	if cfg.ProxyEnable > 0 && proxyCfg != nil {
		switch proxyCfg.Protocol {
		case "socks5":
			auth := &proxy.Auth{
				User:     proxyCfg.Username,
				Password: proxyCfg.Password,
			}
			pd, err := proxy.SOCKS5("tcp", proxyCfg.Addr(), auth, proxy.Direct)
			if err != nil {
				return nil, fmt.Errorf("socks5 proxy setup failed: %w", err)
			}
			if cd, ok := pd.(proxy.ContextDialer); ok {
				baseDialer = cd
			} else {
				baseDialer = netx.NewContextWrapper(pd)
			}
		case "http":
			baseDialer = &netx.HttpConnectDialer{
				ProxyAddr: proxyCfg.Addr(),
				Username:  proxyCfg.Username,
				Password:  proxyCfg.Password,
				Timeout:   options.DialTimeout,
			}
		default:
			baseDialer = &net.Dialer{
				Timeout:   options.DialTimeout,
				KeepAlive: options.ReadTimeout,
			}
		}
	} else {
		baseDialer = &net.Dialer{
			Timeout:   options.DialTimeout,
			KeepAlive: options.ReadTimeout,
		}
	}

	var sshClient *ssh.Client
	if cfg.SshEnable > 0 {
		sshConfig, err := sshCfg.BuildClientCfg()
		if err != nil {
			return nil, err
		}
		sshAddr := sshCfg.Addr()

		sshConn, err := baseDialer.DialContext(ctx, "tcp", sshAddr)
		if err != nil {
			return nil, fmt.Errorf("ssh dial failed: %w", err)
		}

		if d, ok := ctx.Deadline(); ok {
			_ = sshConn.SetDeadline(d)
		}

		c, chans, reqs, err := ssh.NewClientConn(sshConn, sshAddr, sshConfig)
		if err != nil {
			sshConn.Close()
			return nil, fmt.Errorf("ssh handshake failed: %w", err)
		}
		sshClient = ssh.NewClient(c, chans, reqs)
	}

	options.Dialer = func(ctx context.Context, network, addr string) (net.Conn, error) {
		dialAddr := addr
		if mapped, ok := addrMap[addr]; ok {
			dialAddr = mapped
		}

		if cfg.SshEnable > 0 && sshClient != nil {
			type dialResult struct {
				conn net.Conn
				err  error
			}
			ch := make(chan dialResult, 1)
			go func() {
				conn, err := sshClient.Dial(network, dialAddr)
				ch <- dialResult{conn, err}
			}()

			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case res := <-ch:
				if res.err != nil {
					return nil, res.err
				}
				return &netx.IgnoreDeadlineConn{Conn: res.conn}, nil
			}
		}

		conn, err := baseDialer.DialContext(ctx, network, dialAddr)
		if err != nil {
			return nil, err
		}
		return conn, nil
	}

	if cfg.TlsEnable > 0 && tlsCfg != nil {
		tlsConfig, err := tlsCfg.BuildTlsConfig()
		if err != nil {
			return nil, fmt.Errorf("tls build failed: %w", err)
		}
		options.TLSConfig = tlsConfig
	}

	return options, nil
}

func (m *ClientManager) Test(cfg *model.Connection, sshCfg *model.Ssh, proxyCfg *model.Proxy, tlsCfg *model.Tls, dbIdx int) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(cfg.DialTimeout)*time.Second)
	defer cancel()

	rdb, err := m.init(ctx, cfg, sshCfg, proxyCfg, tlsCfg, dbIdx)
	if err != nil {
		return err
	}
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
		c.closeStreams()
		_ = c.Rdb.Close()
		delete(m.clients, key)
		return nil
	}
	return fmt.Errorf("client %s not found", key)
}

func (m *ClientManager) CloseAll() {
	m.mu.Lock()
	defer m.mu.Unlock()
	for key, c := range m.clients {
		c.closeStreams()
		_ = c.Rdb.Close()
		delete(m.clients, key)
	}
}

func (m *ClientManager) Do(ctx context.Context, id string, dbIdx int, args ...interface{}) (interface{}, error) {
	c, err := m.Get(id, dbIdx)
	if err != nil {
		return nil, err
	}
	return c.Rdb.Do(ctx, args...).Result()
}
