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
	ConnectionId  string `json:"connection_id" validate:"required"`
	DatabaseIndex int    `json:"database_index" validate:""`
	Key           string `json:"key" validate:"required"`
}

type LoadKeyDetailLogicResult struct {
	Key   string        `json:"key"`
	Value interface{}   `json:"value"`
	Kind  string        `json:"kind"`
	Ttl   time.Duration `json:"ttl"`
	Total int64         `json:"total"`
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
	cli, err := l.svcCtx.Cli.Get(params.ConnectionId, params.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	var value interface{}
	var kind string
	var total int64
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
		total, err = cli.Rdb.LLen(l.ctx, key).Result()
	case "hash":
		total, err = cli.Rdb.HLen(l.ctx, key).Result()
	case "set":
		total, err = cli.Rdb.SCard(l.ctx, key).Result()
	case "zset":
		total, err = cli.Rdb.ZCard(l.ctx, key).Result()
	case "stream":
		total, err = cli.Rdb.XLen(l.ctx, key).Result()
	case "rejson-rl":
		value, err = cli.Rdb.JSONGet(l.ctx, key).Result()
	case "json", "rejson":
		// handled as string by the client
	}

	if err != nil {
		return nil, err
	}

	return LoadKeyDetailLogicResult{
		Key:   key,
		Value: value,
		Kind:  strings.ToLower(kind),
		Ttl:   ttl,
		Total: total,
	}, nil
}
