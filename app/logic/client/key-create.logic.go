package client

import (
	"context"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/tradalab/rdms/app/svc"
)

type KeyCreateLogicArgs struct {
	DatabaseId    string        `json:"database_id" validate:"required"`
	DatabaseIndex int           `json:"database_index" validate:""`
	Kind          string        `json:"kind" validate:"required"`
	Ttl           int           `json:"ttl" validate:"required"`
	Key           string        `json:"key" validate:"required"`
	ValueString   string        `json:"value_string" validate:""`
	ValueList     []interface{} `json:"value_list" validate:""`
	ValueHash     []struct {
		Key   string `json:"key"`
		Value string `json:"value"`
	} `json:"value_hash" validate:""`
	ValueSet  []interface{} `json:"value_set" validate:""`
	ValueZSet []struct {
		Member string  `json:"member"`
		Score  float64 `json:"score"`
	} `json:"value_zset" validate:""`
	ValueStream struct {
		Id     string      `json:"id"`
		Values interface{} `json:"value"`
	} `json:"value_stream" validate:""`
	ValueJson interface{} `json:"value_json" validate:""`
}

type ClientKeyCreateLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewClientKeyCreateLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ClientKeyCreateLogic {
	return &ClientKeyCreateLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ClientKeyCreateLogic) ClientKeyCreateLogic(params KeyCreateLogicArgs) (interface{}, error) {
	cli, err := l.svcCtx.Cli.Get(params.DatabaseId, params.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	var expiration time.Duration
	if params.Ttl < 0 {
		if expiration, err = cli.Rdb.PTTL(l.ctx, params.Key).Result(); err != nil {
			expiration = redis.KeepTTL
		}
	} else {
		expiration = time.Duration(params.Ttl) * time.Second
	}

	switch strings.ToLower(params.Kind) {
	case "string":
		_, err = cli.Rdb.Set(l.ctx, params.Key, params.ValueString, expiration).Result()
	case "list":
		err = cli.Rdb.LPush(l.ctx, params.Key, params.ValueList...).Err()
		if err == nil && expiration > 0 {
			cli.Rdb.Expire(l.ctx, params.Key, expiration)
		}
	case "hash":
		if len(params.ValueHash) > 0 {
			_, err = cli.Rdb.Pipelined(l.ctx, func(pipe redis.Pipeliner) error {
				for i := 0; i < len(params.ValueHash); i++ {
					pipe.HSet(l.ctx, params.Key, params.ValueHash[i].Key, params.ValueHash[i].Value)
				}
				if expiration > 0 {
					pipe.Expire(l.ctx, params.Key, expiration)
				}
				return nil
			})
		}
	case "set":
		if len(params.ValueSet) > 0 {
			err = cli.Rdb.SAdd(l.ctx, params.Key, params.ValueSet...).Err()
			if err == nil && expiration > 0 {
				cli.Rdb.Expire(l.ctx, params.Key, expiration)
			}
		}
	case "zset":
		if len(params.ValueZSet) > 0 {
			var members []redis.Z
			for i := 0; i < len(params.ValueZSet); i++ {
				members = append(members, redis.Z{
					Member: params.ValueZSet[i].Member,
					Score:  params.ValueZSet[i].Score,
				})
			}
			err = cli.Rdb.ZAdd(l.ctx, params.Key, members...).Err()
			if err == nil && expiration > 0 {
				cli.Rdb.Expire(l.ctx, params.Key, expiration)
			}
		}
	case "stream":
		err = cli.Rdb.XAdd(l.ctx, &redis.XAddArgs{
			Stream: params.Key,
			ID:     params.ValueStream.Id,
			Values: params.ValueStream.Values,
		}).Err()
		if err == nil && expiration > 0 {
			cli.Rdb.Expire(l.ctx, params.Key, expiration)
		}
	case "json":
	case "rejson":
	case "rejson-rl":
		err = cli.Rdb.JSONSet(l.ctx, params.Key, ".", params.ValueJson).Err()
		if err == nil && expiration > 0 {
			cli.Rdb.Expire(l.ctx, params.Key, expiration)
		}
	}

	if err != nil {
		return nil, err
	}

	return nil, nil
}
