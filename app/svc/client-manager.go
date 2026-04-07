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
	"github.com/tradalab/rdms/app/dal/do"
	"github.com/tradalab/rdms/pkg/netx"
	gormmod "github.com/tradalab/scorix/module/gorm"
	"golang.org/x/crypto/ssh"
	"golang.org/x/net/proxy"
)

type ClientManager struct {
	mu      sync.RWMutex
	clients map[string]*Client
	db      *gormmod.GormModule
}

func NewManager(db *gormmod.GormModule) *ClientManager {
	return &ClientManager{
		clients: make(map[string]*Client),
		db:      db,
	}
}

func (m *ClientManager) Add(cfg *do.ConnectionDO, dbIdx int) (*Client, error) {
	key := fmt.Sprintf("%s:%d", cfg.Id, dbIdx)

	m.mu.RLock()
	if c, ok := m.clients[key]; ok {
		isStale := false
		if !cfg.UpdatedAt.Equal(c.Cfg.UpdatedAt) {
			isStale = true
		} else if cfg.SshEnable && cfg.Ssh != nil && c.Cfg.Ssh != nil && !cfg.Ssh.UpdatedAt.Equal(c.Cfg.Ssh.UpdatedAt) {
			isStale = true
		} else if cfg.ProxyEnable && cfg.Proxy != nil && c.Cfg.Proxy != nil && !cfg.Proxy.UpdatedAt.Equal(c.Cfg.Proxy.UpdatedAt) {
			isStale = true
		} else if cfg.TlsEnable && cfg.Tls != nil && c.Cfg.Tls != nil && !cfg.Tls.UpdatedAt.Equal(c.Cfg.Tls.UpdatedAt) {
			isStale = true
		}

		if !isStale {
			m.mu.RUnlock()
			return c, nil
		}

		m.mu.RUnlock()
		_ = m.Remove(cfg.Id.String(), dbIdx)
	} else {
		m.mu.RUnlock()
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(cfg.DialTimeout)*time.Second)
	defer cancel()

	rdb, err := m.init(ctx, cfg, dbIdx)
	if err != nil {
		return nil, err
	}

	if err := rdb.Ping(ctx).Err(); err != nil {
		rdb.Close()
		return nil, fmt.Errorf("cannot connect to redis %s: %w", cfg.Addr(), err)
	}

	_ = rdb.Do(ctx, "CLIENT", "SETNAME", url.QueryEscape(cfg.Name)).Err()

	cli := NewClient(rdb, cfg, dbIdx)

	m.mu.Lock()
	defer m.mu.Unlock()

	if c, ok := m.clients[key]; ok {
		rdb.Close()
		return c, nil
	}

	m.clients[key] = cli

	return cli, nil
}

func (m *ClientManager) init(ctx context.Context, cfg *do.ConnectionDO, dbIdx int) (redis.UniversalClient, error) {
	options, err := m.buildOptions(ctx, cfg, dbIdx)
	if err != nil {
		return nil, err
	}

	rdb := redis.NewUniversalClient(options)

	return rdb, nil
}

func (m *ClientManager) buildOptions(ctx context.Context, cfg *do.ConnectionDO, dbIdx int) (*redis.UniversalOptions, error) {
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
		PoolSize:        1,
	}

	if cfg.SshEnable {
		options.Protocol = 2
		options.ReadTimeout = -1
		options.WriteTimeout = -1
	}

	if cfg.SshEnable && cfg.Ssh == nil && cfg.SshId != nil {
		if err := m.db.DB().WithContext(ctx).Model(&do.SshDO{}).Where("id = ?", *cfg.SshId).First(&cfg.Ssh).Error; err != nil {
			return nil, fmt.Errorf("failed to lazy-load ssh config: %w", err)
		}
	}
	if cfg.ProxyEnable && cfg.Proxy == nil && cfg.ProxyId != nil {
		if err := m.db.DB().WithContext(ctx).Model(&do.ProxyDO{}).Where("id = ?", *cfg.ProxyId).First(&cfg.Proxy).Error; err != nil {
			return nil, fmt.Errorf("failed to lazy-load proxy config: %w", err)
		}
	}
	if cfg.TlsEnable && cfg.Tls == nil && cfg.TlsId != nil {
		if err := m.db.DB().WithContext(ctx).Model(&do.TlsDO{}).Where("id = ?", *cfg.TlsId).First(&cfg.Tls).Error; err != nil {
			return nil, fmt.Errorf("failed to lazy-load tls config: %w", err)
		}
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
			options.Addrs = []string{net.JoinHostPort(cfg.Host, strconv.Itoa(cfg.Port))}
		}
	case "cluster":
		options.Addrs = strings.FieldsFunc(cfg.Addrs, func(r rune) bool {
			return r == ',' || r == '\n' || r == '\r' || r == ' ' || r == '\t' || r == ';'
		})
		if len(options.Addrs) == 0 {
			options.Addrs = []string{net.JoinHostPort(cfg.Host, strconv.Itoa(cfg.Port))}
		}
	default: // standalone/standalone-like
		// set network
		switch cfg.Network {
		case "unix":
			if len(cfg.Sock) <= 0 {
				options.Addrs = []string{"/tmp/redis.sock"}
			} else {
				options.Addrs = []string{cfg.Sock}
			}
		case "tcp":
			// already set in default Addrs
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

	// fallback to host:port if addrs is empty for cluster/sentinel
	if (cfg.Mode == "cluster" || cfg.Mode == "sentinel") && len(options.Addrs) == 0 {
		options.Addrs = []string{cfg.Addr()}
	}

	// set Address Mapping
	addrMap := make(map[string]string)
	if cfg.AddrMapping != "" {
		lines := append([]string{}, netx.SplitLines(cfg.AddrMapping)...)
		for _, line := range lines {
			if kv := netx.SplitKV(line, "="); len(kv) == 2 {
				addrMap[kv[0]] = kv[1]
			}
		}
	}

	// build Base Dialer (with Proxy support if enabled)
	var baseDialer interface {
		DialContext(ctx context.Context, network, addr string) (net.Conn, error)
	}

	if cfg.ProxyEnable && cfg.Proxy != nil {
		switch cfg.Proxy.Protocol {
		case "socks5":
			auth := &proxy.Auth{
				User:     cfg.Proxy.Username,
				Password: cfg.Proxy.Password,
			}
			pd, err := proxy.SOCKS5("tcp", cfg.Proxy.Addr(), auth, proxy.Direct)
			if err != nil {
				return nil, fmt.Errorf("socks5 proxy setup failed: %w", err)
			}
			// SOCKS5 dialer is a proxy.ContextDialer which has DialContext
			if cd, ok := pd.(proxy.ContextDialer); ok {
				baseDialer = cd
			} else {
				// Fallback to wrapper for non-context dialer
				baseDialer = netx.NewContextWrapper(pd)
			}
		case "http":
			baseDialer = &netx.HttpConnectDialer{
				ProxyAddr: cfg.Proxy.Addr(),
				Username:  cfg.Proxy.Username,
				Password:  cfg.Proxy.Password,
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

	// set SSH tunnel (optionally through proxy)
	var sshClient *ssh.Client
	if cfg.SshEnable {
		sshConfig, err := cfg.Ssh.BuildClientCfg()
		if err != nil {
			return nil, err
		}
		sshAddr := cfg.Ssh.Addr()

		// Dial SSH through baseDialer which might be proxy
		sshConn, err := baseDialer.DialContext(ctx, "tcp", sshAddr)
		if err != nil {
			return nil, fmt.Errorf("ssh dial failed: %w", err)
		}

		// set deadline for SSH handshake if context has one
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

	// build Final Dialer
	options.Dialer = func(ctx context.Context, network, addr string) (net.Conn, error) {
		dialAddr := addr
		if mapped, ok := addrMap[addr]; ok {
			dialAddr = mapped
		}

		if cfg.SshEnable && sshClient != nil {
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

	// set TLS
	if cfg.TlsEnable && cfg.Tls != nil {
		tlsConfig, err := cfg.Tls.BuildTlsConfig()
		if err != nil {
			return nil, fmt.Errorf("tls build failed: %w", err)
		}
		options.TLSConfig = tlsConfig
	}

	return options, nil
}

func (m *ClientManager) Test(cfg *do.ConnectionDO, dbIdx int) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(cfg.DialTimeout)*time.Second)
	defer cancel()

	// init cli
	rdb, err := m.init(ctx, cfg, dbIdx)
	if err != nil {
		return err
	}
	defer rdb.Close()

	// test connection
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

func (m *ClientManager) Remove(id string, dbIdx int) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	key := fmt.Sprintf("%s:%d", id, dbIdx)

	if c, ok := m.clients[key]; ok {
		c.PubSubMu.Lock()
		if c.PubSub != nil {
			_ = c.PubSub.Close()
		}
		c.PubSubMu.Unlock()
		_ = c.Rdb.Close()
		delete(m.clients, key)
		return nil
	}
	return fmt.Errorf("client %s not found", key)
}

func (m *ClientManager) Do(ctx context.Context, id string, dbIdx int, args ...interface{}) (interface{}, error) {
	c, err := m.Get(id, dbIdx)
	if err != nil {
		return nil, err
	}
	return c.Rdb.Do(ctx, args...).Result()
}
