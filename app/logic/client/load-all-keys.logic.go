package client

import (
	"context"

	"github.com/redis/go-redis/v9"
	"github.com/tradalab/rdms/app/svc"
	"github.com/tradalab/rdms/pkg/util"
)

type LoadAllKeysLogicArgs struct {
	ConnectionId  string `json:"connection_id" validate:"required"`
	DatabaseIndex int    `json:"database_index" validate:""`
}

type ClientLoadAllKeysLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewClientLoadAllKeysLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ClientLoadAllKeysLogic {
	return &ClientLoadAllKeysLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ClientLoadAllKeysLogic) ClientLoadAllKeysLogic(params LoadAllKeysLogicArgs) (interface{}, error) {
	cli, err := l.svcCtx.Cli.Get(params.ConnectionId, params.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	keys, _, err := scanKeys(l.ctx, cli.Rdb, "", "", 0, 0)
	if err != nil {
		return nil, err
	}

	return keys, nil
}

func scanKeys(ctx context.Context, client redis.UniversalClient, match, keyType string, cursor uint64, count int64) ([]any, uint64, error) {
	var err error
	filterType := len(keyType) > 0
	scanSize := int64(5000)

	scan := func(ctx context.Context, cli redis.UniversalClient, count int64, appendFunc func(k []any)) error {
		var loadedKey []string
		var scanCount int64
		for {
			if filterType {
				loadedKey, cursor, err = cli.ScanType(ctx, cursor, match, scanSize, keyType).Result()
			} else {
				loadedKey, cursor, err = cli.Scan(ctx, cursor, match, scanSize).Result()
			}
			if err != nil {
				return err
			} else {
				ks := util.Map(loadedKey, func(i int) any {
					return util.EncodeRedisKey(loadedKey[i])
				})
				scanCount += int64(len(ks))
				appendFunc(ks)
			}

			if (count > 0 && scanCount > count) || cursor == 0 {
				break
			}
		}
		return nil
	}

	keys := make([]any, 0)
	err = scan(ctx, client, count, func(k []any) {
		keys = append(keys, k...)
	})
	if err != nil {
		return keys, cursor, err
	}

	return keys, cursor, nil
}
