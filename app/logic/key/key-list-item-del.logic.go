package key

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/tradalab/rdms/app/svc"
)

type KeyListItemDelLogicArgs struct {
	ConnectionId  string `json:"connection_id" validate:"required"`
	DatabaseIndex int    `json:"database_index" validate:""`
	Key           string `json:"key" validate:""`
	Value         string `json:"value" validate:""`
	Idx           int64  `json:"idx" validate:""`
}

type KeyListItemDelLogicResult struct {
	Key          string `json:"key"`
	Idx          int64  `json:"idx"`
	Deleted      bool   `json:"deleted"`
	AffectedRows int64  `json:"affected_rows"`
}

type KeyListItemDelLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewKeyListItemDelLogic(ctx context.Context, svcCtx *svc.ServiceContext) *KeyListItemDelLogic {
	return &KeyListItemDelLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *KeyListItemDelLogic) KeyListItemDelLogic(params KeyListItemDelLogicArgs) (*KeyListItemDelLogicResult, error) {

	// 1. Validate input
	if params.Key == "" {
		return nil, errors.New("key is required")
	}

	// 2. Get redis client
	cli, err := l.svcCtx.Cli.Get(params.ConnectionId, params.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	ctx := l.ctx

	// 3. Check key type
	keyType, err := cli.Rdb.Type(ctx, params.Key).Result()
	if err != nil {
		return nil, err
	}
	if keyType != "list" {
		return nil, fmt.Errorf("key type mismatch: expected list, got %s", keyType)
	}

	// 4. Check list length
	length, err := cli.Rdb.LLen(ctx, params.Key).Result()
	if err != nil {
		return nil, err
	}
	if params.Idx < 0 || params.Idx >= length {
		return nil, fmt.Errorf("item index out of range")
	}

	// 5. Validate value
	currentValue, err := cli.Rdb.LIndex(ctx, params.Key, params.Idx).Result()
	if err != nil {
		return nil, err
	}
	if currentValue != params.Value {
		return nil, errors.New("list item changed, please reload")
	}

	// 6. Unique delete marker
	deleteMarker := fmt.Sprintf("__deleted__:%d", time.Now().UnixNano())

	// 7. LSET index -> marker
	if err := cli.Rdb.LSet(ctx, params.Key, params.Idx, deleteMarker).Err(); err != nil {
		return nil, err
	}

	// 8. LREM marker
	deletedCount, err := cli.Rdb.LRem(ctx, params.Key, 1, deleteMarker).Result()
	if err != nil {
		return nil, err
	}

	// 9. Result
	return &KeyListItemDelLogicResult{
		Key:          params.Key,
		Idx:          params.Idx,
		Deleted:      deletedCount > 0,
		AffectedRows: deletedCount,
	}, nil
}
