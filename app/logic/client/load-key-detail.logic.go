package client

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/tradalab/rdms/app/svc"
	"github.com/tradalab/rdms/pkg/util"
)

type LoadKeyDetailLogicArgs struct {
	DatabaseId    string `json:"database_id" validate:"required"`
	DatabaseIndex int    `json:"database_index" validate:""`
	Key           string `json:"key" validate:"required"`
}

type LoadKeyDetailLogicResult struct {
	Key   string        `json:"key"`
	Value interface{}   `json:"value"`
	Kind  string        `json:"kind"`
	Ttl   time.Duration `json:"ttl"`
}

type ClientLoadKeyDetailLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewClientLoadKeyDetailLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ClientLoadKeyDetailLogic {
	return &ClientLoadKeyDetailLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ClientLoadKeyDetailLogic) ClientLoadKeyDetailLogic(params LoadKeyDetailLogicArgs) (interface{}, error) {
	cli, err := l.svcCtx.Cli.Get(params.DatabaseId, params.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	var value interface{}
	var kind string
	var key = params.Key

	kind, err = cli.Rdb.Type(l.ctx, key).Result()
	if err != nil {
		return nil, err
	}
	if kind == "none" {
		return nil, fmt.Errorf("key not exists")
	}

	ttl, err := cli.Rdb.TTL(l.ctx, key).Result()
	if err != nil {
		return nil, err
	}

	switch strings.ToLower(kind) {
	case "string":
		var str string
		str, err = cli.Rdb.Get(l.ctx, key).Result()
		value = util.EncodeRedisKey(str)
	case "list":
		value, err = cli.Rdb.LRange(l.ctx, key, 0, -1).Result()
	case "hash":
		value, err = cli.Rdb.HGetAll(l.ctx, key).Result()
	case "set":
		value, err = cli.Rdb.SMembers(l.ctx, key).Result()
	case "zset":
		value, err = cli.Rdb.ZRangeWithScores(l.ctx, key, 0, -1).Result()
	case "stream":
		value, err = cli.Rdb.XRange(l.ctx, key, "-", "+").Result()
	case "json":
	case "rejson":
	case "rejson-rl":
		value, err = cli.Rdb.JSONGet(l.ctx, key).Result()
	}

	if err != nil {
		return nil, err
	}

	return LoadKeyDetailLogicResult{
		Key:   key,
		Value: value,
		Kind:  strings.ToLower(kind),
		Ttl:   ttl,
	}, nil
}
