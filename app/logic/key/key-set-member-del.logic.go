package key

import (
	"context"
	"errors"
	"fmt"

	"github.com/tradalab/rdms/app/svc"
)

type KeySetMemberDelLogicArgs struct {
	ConnectionId  string `json:"connection_id" validate:"required"`
	DatabaseIndex int    `json:"database_index" validate:""`
	Key           string `json:"key" validate:""`
	Member        string `json:"member" validate:""`
}

type KeySetMemberDelLogicResult struct {
	Key          string `json:"key"`
	Member       string `json:"member"`
	Deleted      bool   `json:"deleted"`
	AffectedRows int64  `json:"affected_rows"`
}

type KeySetMemberDelLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewKeySetMemberDelLogic(ctx context.Context, svcCtx *svc.ServiceContext) *KeySetMemberDelLogic {
	return &KeySetMemberDelLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *KeySetMemberDelLogic) KeySetMemberDelLogic(params KeySetMemberDelLogicArgs) (*KeySetMemberDelLogicResult, error) {
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
	if keyType != "set" {
		return nil, fmt.Errorf("key type mismatch: expected set, got %s", keyType)
	}

	// 4. Execute SREM
	deletedCount, err := cli.Rdb.SRem(ctx, params.Key, params.Member).Result()
	if err != nil {
		return nil, err
	}

	// 5. Result
	return &KeySetMemberDelLogicResult{
		Key:          params.Key,
		Member:       params.Member,
		Deleted:      deletedCount > 0,
		AffectedRows: deletedCount,
	}, nil
}
