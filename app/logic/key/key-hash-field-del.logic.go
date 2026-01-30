package key

import (
	"context"
	"fmt"

	"github.com/tradalab/rdms/app/svc"
)

type KeyHashFieldDelLogicArgs struct {
	ConnectionId  string `json:"connection_id" validate:"required"`
	DatabaseIndex int    `json:"database_index" validate:""`
	Key           string `json:"key" validate:""`
	Field         string `json:"field" validate:""`
}

type KeyHashFieldDelLogicResult struct {
	Key          string `json:"key"`
	Field        string `json:"field"`
	Deleted      bool   `json:"deleted"`
	AffectedRows int64  `json:"affected_rows"`
}

type KeyHashFieldDelLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewKeyHashFieldDelLogic(ctx context.Context, svcCtx *svc.ServiceContext) *KeyHashFieldDelLogic {
	return &KeyHashFieldDelLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *KeyHashFieldDelLogic) KeyHashFieldDelLogic(params KeyHashFieldDelLogicArgs) (*KeyHashFieldDelLogicResult, error) {
	cli, err := l.svcCtx.Cli.Get(params.ConnectionId, params.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	keyType, err := cli.Rdb.Type(l.ctx, params.Key).Result()
	if err != nil {
		return nil, err
	}
	if keyType != "hash" {
		return nil, fmt.Errorf("key type mismatch: expected hash, got %s", keyType)
	}

	deletedCount, err := cli.Rdb.HDel(l.ctx, params.Key, params.Field).Result()
	if err != nil {
		return nil, err
	}

	return &KeyHashFieldDelLogicResult{
		Key:          params.Key,
		Field:        params.Field,
		Deleted:      deletedCount > 0,
		AffectedRows: deletedCount,
	}, nil
}
