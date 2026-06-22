package svc

import (
	"context"
	"net"
	"strings"
	"sync"
	"sync/atomic"

	"github.com/redis/go-redis/v9"
	"github.com/tradalab/rdms/internal/model"
)

type Client struct {
	Rdb           redis.UniversalClient
	Cfg           *model.Connection
	Ssh           *model.Ssh
	Proxy         *model.Proxy
	Tls           *model.Tls
	DbIdx         int
	PubSub        *redis.PubSub
	PubSubActive  bool
	PubSubMu      sync.Mutex
	MonitorConn   net.Conn
	MonitorCancel context.CancelFunc
	MonitorActive bool
	MonitorMu     sync.Mutex
	ReadOnly      atomic.Bool
	writeCmds     map[string]struct{}
}

func NewClient(rdb redis.UniversalClient, cfg *model.Connection, ssh *model.Ssh, proxy *model.Proxy, tls *model.Tls, dbIdx int) *Client {
	return &Client{Rdb: rdb, Cfg: cfg, Ssh: ssh, Proxy: proxy, Tls: tls, DbIdx: dbIdx}
}

func (c *Client) closeStreams() {
	c.MonitorMu.Lock()
	if c.MonitorCancel != nil {
		c.MonitorCancel()
		c.MonitorCancel = nil
	}
	c.MonitorActive = false
	c.MonitorMu.Unlock()

	c.PubSubMu.Lock()
	if c.PubSub != nil {
		_ = c.PubSub.Close()
		c.PubSub = nil
	}
	c.PubSubActive = false
	c.PubSubMu.Unlock()
}

func (c *Client) GetInfo(ctx context.Context, sections ...string) (map[string]map[string]string, error) {
	res, err := c.Rdb.Info(ctx, sections...).Result()
	if err != nil {
		return nil, err
	}
	info := c.parseInfo(res)
	return info, nil
}

func (c *Client) parseInfo(info string) map[string]map[string]string {
	parsedInfo := map[string]map[string]string{}
	lines := strings.Split(info, "\r\n")
	if len(lines) > 0 {
		var subInfo map[string]string
		for _, line := range lines {
			if strings.HasPrefix(line, "#") {
				subInfo = map[string]string{}
				parsedInfo[strings.TrimSpace(strings.TrimLeft(line, "#"))] = subInfo
			} else {
				items := strings.SplitN(line, ":", 2)
				if len(items) < 2 {
					continue
				}
				subInfo[items[0]] = items[1]
			}
		}
	}
	return parsedInfo
}
