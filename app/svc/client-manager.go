package svc

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/tradalab/rdms/app/dal/do"
	"github.com/tradalab/rdms/pkg/netx"
	"golang.org/x/crypto/ssh"
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
			return r == ',' || r == '\n' || r == '\r'
		})
	case "cluster":
		options.Addrs = strings.FieldsFunc(cfg.Addrs, func(r rune) bool {
			return r == ',' || r == '\n' || r == '\r'
		})
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

	for i, addr := range options.Addrs {
		options.Addrs[i] = strings.TrimSpace(addr)
	}

	// set SSH tunnel
	if cfg.SshEnable {
		sshConfig, err := cfg.Ssh.BuildClientCfg()
		if err != nil {
			return nil, err
		}

		sshAddr := cfg.Ssh.Addr()

		sshClient, err := ssh.Dial("tcp", sshAddr, sshConfig)
		if err != nil {
			return nil, fmt.Errorf("ssh dial failed: %w", err)
		}

		var localAddrs []string
		for _, remoteAddr := range options.Addrs {
			localAddr, err := netx.StartSSHTunnel(sshClient, "tcp", remoteAddr)
			if err != nil {
				return nil, err
			}
			localAddrs = append(localAddrs, localAddr)
		}
		options.Addrs = localAddrs
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
