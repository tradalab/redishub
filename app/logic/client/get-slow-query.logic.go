package client

import (
	"context"

	"github.com/tradalab/rdms/app/svc"
)

type GetSlowQueryLogicArgs struct {
	ConnectionId  string `json:"connection_id" validate:"required"`
	DatabaseIndex int    `json:"database_index" validate:""`
}

type GetSlowQueryLogicResult struct {
	Logs interface{} `json:"logs"`
}

type ClientGetSlowQuery struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewClientGetSlowQuery(ctx context.Context, svcCtx *svc.ServiceContext) *ClientGetSlowQuery {
	return &ClientGetSlowQuery{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ClientGetSlowQuery) ClientGetSlowQuery(params GetSlowQueryLogicArgs) (interface{}, error) {
	cli, err := l.svcCtx.Cli.Get(params.ConnectionId, params.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	// todo remove hard code
	logs, err := cli.Rdb.SlowLogGet(l.ctx, 1000).Result()
	if err != nil {
		return nil, err
	}

	return GetSlowQueryLogicResult{
		Logs: logs,
	}, nil
}
