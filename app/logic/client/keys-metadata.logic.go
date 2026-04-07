package client

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/tradalab/rdms/app/svc"
)

type KeysMetadataLogicArgs struct {
	ConnectionId  string   `json:"connection_id" validate:"required"`
	DatabaseIndex int      `json:"database_index" validate:""`
	Keys          []string `json:"keys" validate:"required"`
}

type KeyMetadata struct {
	Key  string        `json:"key"`
	Type string        `json:"type"`
	Ttl  time.Duration `json:"ttl"`
	Size int64         `json:"size"`
}

type ClientKeysMetadataLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewClientKeysMetadataLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ClientKeysMetadataLogic {
	return &ClientKeysMetadataLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ClientKeysMetadataLogic) ClientKeysMetadataLogic(params KeysMetadataLogicArgs) (interface{}, error) {
	cli, err := l.svcCtx.Cli.Get(params.ConnectionId, params.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	pipe := cli.Rdb.Pipeline()
	typeCmds := make([]*redis.StatusCmd, len(params.Keys))
	ttlCmds := make([]*redis.DurationCmd, len(params.Keys))
	sizeCmds := make([]*redis.IntCmd, len(params.Keys))

	for i, key := range params.Keys {
		typeCmds[i] = pipe.Type(l.ctx, key)
		ttlCmds[i] = pipe.PTTL(l.ctx, key)
		sizeCmds[i] = pipe.MemoryUsage(l.ctx, key)
	}

	_, _ = pipe.Exec(l.ctx)

	results := make([]KeyMetadata, 0, len(params.Keys))
	for i, key := range params.Keys {
		kind, _ := typeCmds[i].Result()
		ttl, _ := ttlCmds[i].Result()
		size, _ := sizeCmds[i].Result()

		results = append(results, KeyMetadata{
			Key:  key,
			Type: kind,
			Ttl:  ttl,
			Size: size,
		})
	}

	return results, nil
}
