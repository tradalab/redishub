package key

import (
	"context"
	"strconv"

	"github.com/redis/go-redis/v9"
	"github.com/tradalab/rdms/app/svc"
	"github.com/tradalab/rdms/pkg/util"
)

type KeyLoadLogicArgs struct {
	DatabaseId    string `json:"database_id" validate:"required"`
	DatabaseIndex int    `json:"database_index" validate:""`
	Cursor        string `json:"cursor" validate:""`
	Count         int64  `json:"count" validate:""`
}

type KeyLoadLogicResult struct {
	Keys   []any  `json:"keys"`
	Cursor string `json:"cursor"`
}

type KeyLoadLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewKeyLoadLogic(ctx context.Context, svcCtx *svc.ServiceContext) *KeyLoadLogic {
	return &KeyLoadLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *KeyLoadLogic) KeyLoadLogic(params KeyLoadLogicArgs) (*KeyLoadLogicResult, error) {
	cli, err := l.svcCtx.Cli.Get(params.DatabaseId, params.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	num, err := strconv.ParseUint(params.Cursor, 10, 64)
	if err != nil {
		return nil, err
	}

	keys, cursor, err := scanKeys(l.ctx, cli.Rdb, "", "", num, params.Count)
	if err != nil {
		return nil, err
	}

	return &KeyLoadLogicResult{
		Keys:   keys,
		Cursor: strconv.FormatUint(cursor, 10),
	}, nil
}

func scanKeys(ctx context.Context, client redis.UniversalClient, match, keyType string, cursor uint64, count int64) ([]any, uint64, error) {
	var err error
	filterType := len(keyType) > 0

	scanSize := count
	if scanSize <= 0 {
		scanSize = 500 // fallback
	}

	var keys []any
	var loadedKey []string

	if filterType {
		loadedKey, cursor, err = client.ScanType(ctx, cursor, match, scanSize, keyType).Result()
	} else {
		loadedKey, cursor, err = client.Scan(ctx, cursor, match, scanSize).Result()
	}
	if err != nil {
		return nil, cursor, err
	}

	for _, v := range loadedKey {
		keys = append(keys, util.EncodeRedisKey(v))
	}

	return keys, cursor, nil
}
