package client

import (
	"context"

	"github.com/tradalab/rdms/app/svc"
)

type KeyNameUpdateLogicArgs struct {
	ConnectionId  string `json:"connection_id" validate:"required"`
	DatabaseIndex int    `json:"database_index" validate:""`
	CurrentName   string `json:"current_name" validate:"required"`
	NewName       string `json:"new_name" validate:"required"`
}

type KeyNameUpdateLogicResult struct{}

type ClientKeyNameUpdateLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewClientKeyNameUpdateLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ClientKeyNameUpdateLogic {
	return &ClientKeyNameUpdateLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ClientKeyNameUpdateLogic) ClientKeyNameUpdateLogic(params KeyNameUpdateLogicArgs) (interface{}, error) {
	cli, err := l.svcCtx.Cli.Get(params.ConnectionId, params.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	err = cli.Rdb.Rename(l.ctx, params.CurrentName, params.NewName).Err()
	if err != nil {
		return nil, err
	}

	return nil, nil
}
