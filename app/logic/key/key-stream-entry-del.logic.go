package key

import (
	"context"
	"errors"
	"fmt"

	"github.com/tradalab/rdms/app/svc"
)

type KeyStreamEntryDelLogicArgs struct {
	ConnectionId  string `json:"connection_id" validate:"required"`
	DatabaseIndex int    `json:"database_index" validate:""`
	Key           string `json:"key" validate:""`
	EntryId       string `json:"entry_id" validate:""`
}

type KeyStreamEntryDelLogicResult struct {
	Key          string `json:"key"`
	EntryId      string `json:"entry_id"`
	Deleted      bool   `json:"deleted"`
	AffectedRows int64  `json:"affected_rows"`
}

type KeyStreamEntryDelLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewKeyStreamEntryDelLogic(ctx context.Context, svcCtx *svc.ServiceContext) *KeyStreamEntryDelLogic {
	return &KeyStreamEntryDelLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *KeyStreamEntryDelLogic) KeyStreamEntryDelLogic(params KeyStreamEntryDelLogicArgs) (*KeyStreamEntryDelLogicResult, error) {
	ctx := l.ctx

	// 1. Validate input
	if params.Key == "" {
		return nil, errors.New("key is required")
	}
	if params.EntryId == "" {
		return nil, errors.New("entry_id is required")
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
	if keyType != "stream" {
		return nil, fmt.Errorf("key type mismatch: expected stream, got %s", keyType)
	}

	// 4. Execute XDEL
	deletedCount, err := cli.Rdb.XDel(ctx, params.Key, params.EntryId).Result()
	if err != nil {
		return nil, err
	}

	// 5. Result
	return &KeyStreamEntryDelLogicResult{
		Key:          params.Key,
		EntryId:      params.EntryId,
		Deleted:      deletedCount > 0,
		AffectedRows: deletedCount,
	}, nil
}
