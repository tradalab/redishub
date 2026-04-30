package client

import (
	"context"

	"github.com/tradalab/rdms/app/svc"
)

type SearchKeysLogicArgs struct {
	ConnectionId  string `json:"connection_id" validate:"required"`
	DatabaseIndex int    `json:"database_index"`
	Prefix        string `json:"prefix"`
	Count         int64  `json:"count"`
}

type ClientSearchKeysLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewClientSearchKeysLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ClientSearchKeysLogic {
	return &ClientSearchKeysLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ClientSearchKeysLogic) ClientSearchKeysLogic(params SearchKeysLogicArgs) (interface{}, error) {
	cli, err := l.svcCtx.Cli.Get(params.ConnectionId, params.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	count := params.Count
	if count <= 0 {
		count = 50 // Default limit for autocomplete
	}

	match := params.Prefix + "*"

	keys, _, err := cli.Rdb.Scan(l.ctx, 0, match, count).Result()
	if err != nil {
		return nil, err
	}

	return keys, nil
}
