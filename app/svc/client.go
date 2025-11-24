package svc

import (
	"context"
	"strings"

	"github.com/redis/go-redis/v9"
	"github.com/tradalab/rdms/app/dal/do"
)

type Client struct {
	Rdb   *redis.Client
	Cfg   *do.DatabaseDO
	DbIdx int
}

//type RdbInfo map[string]map[string]string

func NewClient(rdb *redis.Client, cfg *do.DatabaseDO, dbIdx int) *Client {
	return &Client{Rdb: rdb, Cfg: cfg, DbIdx: dbIdx}
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
