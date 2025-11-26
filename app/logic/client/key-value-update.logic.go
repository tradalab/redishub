package client

import (
	"context"

	"github.com/redis/go-redis/v9"
	"github.com/tradalab/rdms/app/svc"
)

type KeyValueUpdateLogicArgs struct {
	ConnectionId   string      `json:"connection_id" validate:"required"`
	DatabaseIndex  int         `json:"database_index" validate:""`
	KeyName        string      `json:"key_name" validate:"required"`
	KeyKind        string      `json:"key_kind" validate:"required"`
	KeyValueString string      `json:"key_value_string" validate:""`
	KeyValueJson   interface{} `json:"key_value_json" validate:""`
	KeyValueHash   []struct {
		Key   string `json:"key"`
		Value string `json:"value"`
	} `json:"key_value_hash" validate:""`
	KeyValueSet  []interface{} `json:"key_value_set" validate:""`
	KeyValueZSet []struct {
		Member string  `json:"member"`
		Score  float64 `json:"score"`
	} `json:"key_value_zset" validate:""`
	KeyValueStream struct {
		Id     string      `json:"id"`
		Values interface{} `json:"value"`
	} `json:"key_value_stream" validate:""`
	KeyValueList []interface{} `json:"key_value_list" validate:""`
}

type KeyValueUpdateLogicResult struct{}

type ClientKeyValueUpdateLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewClientKeyValueUpdateLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ClientKeyValueUpdateLogic {
	return &ClientKeyValueUpdateLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ClientKeyValueUpdateLogic) ClientKeyValueUpdateLogic(params KeyValueUpdateLogicArgs) (interface{}, error) {
	cli, err := l.svcCtx.Cli.Get(params.ConnectionId, params.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	switch params.KeyKind {
	case "string":
		err = cli.Rdb.SetArgs(l.ctx, params.KeyName, params.KeyValueString, redis.SetArgs{KeepTTL: true}).Err()
	case "list":
		if len(params.KeyValueList) > 0 {
			err = cli.Rdb.LPush(l.ctx, params.KeyName, params.KeyValueList...).Err()
		}
	case "hash":
		if len(params.KeyValueHash) > 0 {
			_, err = cli.Rdb.Pipelined(l.ctx, func(pipe redis.Pipeliner) error {
				for i := 0; i < len(params.KeyValueHash); i++ {
					pipe.HSet(l.ctx, params.KeyName, params.KeyValueHash[i].Key, params.KeyValueHash[i].Value)
				}
				return nil
			})
		}
	case "set":
		if len(params.KeyValueSet) > 0 {
			err = cli.Rdb.SAdd(l.ctx, params.KeyName, params.KeyValueSet...).Err()
		}
	case "zset":
		if len(params.KeyValueZSet) > 0 {
			var members []redis.Z
			for i := 0; i < len(params.KeyValueZSet); i++ {
				members = append(members, redis.Z{
					Member: params.KeyValueZSet[i].Member,
					Score:  params.KeyValueZSet[i].Score,
				})
			}
			args := redis.ZAddArgs{
				NX:      false,
				Members: members,
			}
			err = cli.Rdb.ZAddArgs(l.ctx, params.KeyName, args).Err()
		}
	case "stream":
		err = cli.Rdb.XAdd(l.ctx, &redis.XAddArgs{
			Stream: params.KeyName,
			ID:     params.KeyValueStream.Id,
			Values: params.KeyValueStream.Values,
		}).Err()
	case "json":
	case "rejson":
	case "rejson-rl":
		err = cli.Rdb.JSONSet(l.ctx, params.KeyName, ".", params.KeyValueJson).Err()
	}

	return nil, nil
}
