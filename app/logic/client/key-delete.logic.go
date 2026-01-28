package client

import (
	"context"

	"github.com/tradalab/rdms/app/svc"
)

type KeyDeleteLogicArgs struct {
	ConnectionId  string `json:"connection_id" validate:"required"`
	DatabaseIndex int    `json:"database_index" validate:""`
	Key           string `json:"key" validate:"required"`
}

type ClientKeyDeleteLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewClientKeyDeleteLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ClientKeyDeleteLogic {
	return &ClientKeyDeleteLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ClientKeyDeleteLogic) ClientKeyDeleteLogic(params KeyDeleteLogicArgs) (interface{}, error) {
	cli, err := l.svcCtx.Cli.Get(params.ConnectionId, params.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	err = cli.Rdb.Del(l.ctx, params.Key).Err()
	if err != nil {
		return nil, err
	}

	return nil, nil
}
