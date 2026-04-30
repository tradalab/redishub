package client

import (
	"context"
	"fmt"

	"github.com/tradalab/rdms/app/svc"
)

type KeysDeleteByPrefixLogicArgs struct {
	ConnectionId  string   `json:"connection_id" validate:"required"`
	DatabaseIndex int      `json:"database_index"`
	Prefix        string   `json:"prefix"`
	Keys          []string `json:"keys"`
}

type KeysScanByPrefixLogicArgs struct {
	ConnectionId  string `json:"connection_id" validate:"required"`
	DatabaseIndex int    `json:"database_index"`
	Prefix        string `json:"prefix" validate:"required"`
	Cursor        uint64 `json:"cursor"`
	Limit         int64  `json:"limit"`
}

type ClientKeysDeleteByPrefixLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewClientKeysDeleteByPrefixLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ClientKeysDeleteByPrefixLogic {
	return &ClientKeysDeleteByPrefixLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ClientKeysDeleteByPrefixLogic) ClientKeysScanByPrefixLogic(params KeysScanByPrefixLogicArgs) (interface{}, error) {
	cli, err := l.svcCtx.Cli.Get(params.ConnectionId, params.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	match := params.Prefix + "*"
	limit := params.Limit
	if limit <= 0 {
		limit = 1000
	}

	keys, nextCursor, err := cli.Rdb.Scan(l.ctx, params.Cursor, match, limit).Result()
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"keys":        keys,
		"next_cursor": nextCursor,
	}, nil
}

func (l *ClientKeysDeleteByPrefixLogic) ClientKeysDeleteByPrefixLogic(params KeysDeleteByPrefixLogicArgs) (interface{}, error) {
	cli, err := l.svcCtx.Cli.Get(params.ConnectionId, params.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	eventTopic := fmt.Sprintf("client:keys-delete-progress:%s", params.ConnectionId)

	if len(params.Keys) > 0 {
		batchSize := 1000
		totalDeleted := 0
		for i := 0; i < len(params.Keys); i += batchSize {
			end := i + batchSize
			if end > len(params.Keys) {
				end = len(params.Keys)
			}
			batch := params.Keys[i:end]

			err = cli.Rdb.Del(l.ctx, batch...).Err()
			if err != nil {
				return nil, err
			}
			totalDeleted += len(batch)

			l.svcCtx.App.Evt().Emit(l.ctx, "", eventTopic, map[string]interface{}{
				"prefix":  params.Prefix,
				"deleted": totalDeleted,
				"total":   len(params.Keys),
				"status":  "processing",
			})
		}

		l.svcCtx.App.Evt().Emit(l.ctx, "", eventTopic, map[string]interface{}{
			"prefix":  params.Prefix,
			"deleted": totalDeleted,
			"total":   len(params.Keys),
			"status":  "done",
		})

		return map[string]interface{}{
			"total_deleted": totalDeleted,
		}, nil
	}

	if params.Prefix == "" {
		return nil, fmt.Errorf("prefix or keys must be provided")
	}

	match := params.Prefix + "*"
	cursor := uint64(0)
	batchSize := int64(1000)
	totalDeleted := 0

	for {
		keys, nextCursor, err := cli.Rdb.Scan(l.ctx, cursor, match, batchSize).Result()
		if err != nil {
			return nil, err
		}

		if len(keys) > 0 {
			err = cli.Rdb.Del(l.ctx, keys...).Err()
			if err != nil {
				return nil, err
			}
			totalDeleted += len(keys)

			l.svcCtx.App.Evt().Emit(l.ctx, "", eventTopic, map[string]interface{}{
				"prefix":  params.Prefix,
				"deleted": totalDeleted,
				"status":  "processing",
			})
		}

		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}

	l.svcCtx.App.Evt().Emit(l.ctx, "", eventTopic, map[string]interface{}{
		"prefix":  params.Prefix,
		"deleted": totalDeleted,
		"status":  "done",
	})

	return map[string]interface{}{
		"total_deleted": totalDeleted,
	}, nil
}
