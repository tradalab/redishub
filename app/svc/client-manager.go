package svc

import (
	"context"
	"fmt"
	"net"
	"net/url"
	"strconv"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/tradalab/rdms/app/dal/do"
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

	// init cli
	rdb, err := m.init(cfg, dbIdx)
	if err != nil {
		return nil, err
	}

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("cannot connect to redis %s: %w", cfg.Addr(), err)
	}

	_ = rdb.Do(ctx, "CLIENT", "SETNAME", url.QueryEscape(cfg.Name)).Err()

	cli := NewClient(rdb, cfg, dbIdx)

	m.clients[key] = cli

	return cli, nil
}

func (m *ClientManager) init(cfg *do.ConnectionDO, dbIdx int) (*redis.Client, error) {
	options := &redis.Options{
		Addr:             cfg.Addr(),
		Username:         cfg.Username,
		Password:         cfg.Password,
		DB:               dbIdx,
		DialTimeout:      5 * time.Second,
		DisableIndentity: true,
		IdentitySuffix:   "rdms_",
	}

	// set network
	switch cfg.Network {
	case "unix":
		options.Network = "unix"
		if len(cfg.Sock) <= 0 {
			options.Addr = "/tmp/redis.sock"
		} else {
			options.Addr = cfg.Sock
		}
	case "tcp":
		options.Network = "tcp"
		port := 6379
		host := "127.0.0.1"
		if cfg.Port > 0 {
			port = cfg.Port
		}
		if len(cfg.Host) > 0 {
			host = cfg.Host
		}
		options.Addr = net.JoinHostPort(host, strconv.Itoa(port))
	default:
		return nil, fmt.Errorf("unknown network type: %s", cfg.Network)
	}

	rdb := redis.NewClient(options)

	return rdb, nil
}

func (m *ClientManager) Test(cfg *do.ConnectionDO, dbIdx int) error {
	// init cli
	rdb, err := m.init(cfg, dbIdx)
	if err != nil {
		return err
	}

	// test connection
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
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
