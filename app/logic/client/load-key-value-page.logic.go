package client

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/tradalab/rdms/app/svc"
)

type LoadKeyValuePageLogicArgs struct {
	ConnectionId  string `json:"connection_id" validate:"required"`
	DatabaseIndex int    `json:"database_index"`
	Key           string `json:"key" validate:"required"`
	Kind          string `json:"kind" validate:"required"`
	Cursor        string `json:"cursor"`
	PageSize      int64  `json:"page_size"`
}

type LoadKeyValuePageLogicResult struct {
	Items      interface{} `json:"items"`
	NextCursor string      `json:"next_cursor"`
	HasMore    bool        `json:"has_more"`
}

type HashPageItem struct {
	Field string `json:"field"`
	Value string `json:"value"`
}

type ListPageItem struct {
	Index int64  `json:"index"`
	Value string `json:"value"`
}

type SetPageItem struct {
	Member string `json:"member"`
}

type ZSetPageItem struct {
	Member string  `json:"member"`
	Score  float64 `json:"score"`
}

type StreamPageItem struct {
	Id    string                 `json:"id"`
	Value map[string]interface{} `json:"value"`
}

type ClientLoadKeyValuePageLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewClientLoadKeyValuePageLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ClientLoadKeyValuePageLogic {
	return &ClientLoadKeyValuePageLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ClientLoadKeyValuePageLogic) ClientLoadKeyValuePageLogic(params LoadKeyValuePageLogicArgs) (interface{}, error) {
	cli, err := l.svcCtx.Cli.Get(params.ConnectionId, params.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	pageSize := params.PageSize
	if pageSize <= 0 {
		pageSize = 200
	}

	cursor := params.Cursor
	if cursor == "" {
		cursor = "0"
	}

	switch strings.ToLower(params.Kind) {
	case "hash":
		cursorInt, _ := strconv.ParseUint(cursor, 10, 64)
		keys, nextCursor, err := cli.Rdb.HScan(l.ctx, params.Key, cursorInt, "*", pageSize).Result()
		if err != nil {
			return nil, err
		}
		items := make([]HashPageItem, 0, len(keys)/2)
		for i := 0; i+1 < len(keys); i += 2 {
			items = append(items, HashPageItem{Field: keys[i], Value: keys[i+1]})
		}
		nextCursorStr := strconv.FormatUint(nextCursor, 10)
		return LoadKeyValuePageLogicResult{
			Items:      items,
			NextCursor: nextCursorStr,
			HasMore:    nextCursor != 0,
		}, nil

	case "set":
		cursorInt, _ := strconv.ParseUint(cursor, 10, 64)
		members, nextCursor, err := cli.Rdb.SScan(l.ctx, params.Key, cursorInt, "*", pageSize).Result()
		if err != nil {
			return nil, err
		}
		items := make([]SetPageItem, len(members))
		for i, m := range members {
			items[i] = SetPageItem{Member: m}
		}
		nextCursorStr := strconv.FormatUint(nextCursor, 10)
		return LoadKeyValuePageLogicResult{
			Items:      items,
			NextCursor: nextCursorStr,
			HasMore:    nextCursor != 0,
		}, nil

	case "zset":
		cursorInt, _ := strconv.ParseUint(cursor, 10, 64)
		vals, nextCursor, err := cli.Rdb.ZScan(l.ctx, params.Key, cursorInt, "*", pageSize).Result()
		if err != nil {
			return nil, err
		}
		items := make([]ZSetPageItem, 0, len(vals)/2)
		for i := 0; i+1 < len(vals); i += 2 {
			score, _ := strconv.ParseFloat(vals[i+1], 64)
			items = append(items, ZSetPageItem{Member: vals[i], Score: score})
		}
		nextCursorStr := strconv.FormatUint(nextCursor, 10)
		return LoadKeyValuePageLogicResult{
			Items:      items,
			NextCursor: nextCursorStr,
			HasMore:    nextCursor != 0,
		}, nil

	case "list":
		offset, _ := strconv.ParseInt(cursor, 10, 64)
		totalLen, err := cli.Rdb.LLen(l.ctx, params.Key).Result()
		if err != nil {
			return nil, err
		}
		vals, err := cli.Rdb.LRange(l.ctx, params.Key, offset, offset+pageSize-1).Result()
		if err != nil {
			return nil, err
		}
		items := make([]ListPageItem, len(vals))
		for i, v := range vals {
			items[i] = ListPageItem{Index: offset + int64(i), Value: v}
		}
		nextOffset := offset + int64(len(vals))
		hasMore := nextOffset < totalLen
		nextCursorStr := strconv.FormatInt(nextOffset, 10)
		if !hasMore {
			nextCursorStr = "0"
		}
		return LoadKeyValuePageLogicResult{
			Items:      items,
			NextCursor: nextCursorStr,
			HasMore:    hasMore,
		}, nil

	case "stream":
		start := cursor
		if start == "0" || start == "" {
			start = "-"
		} else {
			start = incrementStreamID(start)
		}
		msgs, err := cli.Rdb.XRangeN(l.ctx, params.Key, start, "+", pageSize).Result()
		if err != nil {
			return nil, err
		}
		items := make([]StreamPageItem, len(msgs))
		for i, msg := range msgs {
			items[i] = StreamPageItem{Id: msg.ID, Value: msg.Values}
		}
		hasMore := int64(len(msgs)) >= pageSize
		nextCursorStr := "0"
		if hasMore && len(msgs) > 0 {
			nextCursorStr = msgs[len(msgs)-1].ID
		}
		return LoadKeyValuePageLogicResult{
			Items:      items,
			NextCursor: nextCursorStr,
			HasMore:    hasMore,
		}, nil

	default:
		return nil, fmt.Errorf("unsupported kind: %s", params.Kind)
	}
}

// incrementStreamID increments the sequence part of a Redis stream ID (ms-seq).
func incrementStreamID(id string) string {
	parts := strings.SplitN(id, "-", 2)
	if len(parts) != 2 {
		return id
	}
	seq, err := strconv.ParseUint(parts[1], 10, 64)
	if err != nil {
		return id
	}
	return fmt.Sprintf("%s-%d", parts[0], seq+1)
}
