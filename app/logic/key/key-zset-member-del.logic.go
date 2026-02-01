package key

import (
	"context"
	"errors"
	"fmt"

	"github.com/tradalab/rdms/app/svc"
)

type KeyZSetMemberDelLogicArgs struct {
	ConnectionId  string `json:"connection_id" validate:"required"`
	DatabaseIndex int    `json:"database_index" validate:""`
	Key           string `json:"key" validate:""`
	Member        string `json:"member" validate:""`
}

type KeyZSetMemberDelLogicResult struct {
	Key          string `json:"key"`
	Member       string `json:"member"`
	Deleted      bool   `json:"deleted"`
	AffectedRows int64  `json:"affected_rows"`
}

type KeyZSetMemberDelLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewKeyZSetMemberDelLogic(ctx context.Context, svcCtx *svc.ServiceContext) *KeyZSetMemberDelLogic {
	return &KeyZSetMemberDelLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *KeyZSetMemberDelLogic) KeyZSetMemberDelLogic(params KeyZSetMemberDelLogicArgs) (*KeyZSetMemberDelLogicResult, error) {
	ctx := l.ctx

	// 1. Validate input
	if params.Key == "" {
		return nil, errors.New("key is required")
	}
	if params.Member == "" {
		return nil, errors.New("member is required")
	}

	// 2. Get redis client
	cli, err := l.svcCtx.Cli.Get(params.ConnectionId, params.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	// 3. Check key type
	keyType, err := cli.Rdb.Type(ctx, params.Key).Result()
	if err != nil {
		return nil, err
	}
	if keyType != "zset" {
		return nil, fmt.Errorf("key type mismatch: expected zset, got %s", keyType)
	}

	// 4. Execute ZREM
	deletedCount, err := cli.Rdb.ZRem(ctx, params.Key, params.Member).Result()
	if err != nil {
		return nil, err
	}

	// 5. Result
	return &KeyZSetMemberDelLogicResult{
		Key:          params.Key,
		Member:       params.Member,
		Deleted:      deletedCount > 0,
		AffectedRows: deletedCount,
	}, nil
}
