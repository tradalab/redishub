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

func (m *ClientManager) Add(cfg *do.ConnectionDO, dbIdx int) (*Client, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	key := fmt.Sprintf("%s:%d", cfg.Id, dbIdx)

	if _, ok := m.clients[key]; ok {
		return nil, fmt.Errorf("client %s already exists", key)
	}

	rdb, err := m.init(cfg, dbIdx)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(cfg.DialTimeout)*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("cannot connect to redis %s: %w", cfg.Addr(), err)
	}

	_ = rdb.Do(ctx, "CLIENT", "SETNAME", url.QueryEscape(cfg.Name)).Err()

	cli := NewClient(rdb, cfg, dbIdx)

	m.clients[key] = cli

	return cli, nil
}

func (m *ClientManager) init(cfg *do.ConnectionDO, dbIdx int) (redis.UniversalClient, error) {
	options, err := m.buildOptions(cfg, dbIdx)
	if err != nil {
		return nil, err
	}

	rdb := redis.NewUniversalClient(options)

	return rdb, nil
}

func (m *ClientManager) buildOptions(cfg *do.ConnectionDO, dbIdx int) (*redis.UniversalOptions, error) {
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
		sshConn, err := baseDialer.DialContext(context.Background(), "tcp", sshAddr)
		if err != nil {
			return nil, fmt.Errorf("ssh dial failed: %w", err)
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
			return sshClient.Dial(network, dialAddr)
		}

		return baseDialer.DialContext(ctx, network, dialAddr)
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
	// init cli
	rdb, err := m.init(cfg, dbIdx)
	if err != nil {
		return err
	}

	// test connection
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(cfg.DialTimeout)*time.Second)
	defer cancel()
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
