package client

import (
	"context"
	"strconv"

	"github.com/tradalab/rdms/app/svc"
)

type GeneralLogicArgs struct {
	DatabaseId    string `json:"database_id" validate:"required"`
	DatabaseIndex int    `json:"database_index" validate:""`
}

type GeneralLogicResult struct {
	Info    interface{} `json:"info"`
	TotalDb int         `json:"total_db"`
}

type ClientGeneralLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewClientGeneralLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ClientGeneralLogic {
	return &ClientGeneralLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ClientGeneralLogic) ClientGeneralLogic(params GeneralLogicArgs) (interface{}, error) {
	cli, err := l.svcCtx.Cli.Get(params.DatabaseId, params.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	info, err := cli.Rdb.Info(l.ctx).Result()
	if err != nil {
		return nil, err
	}

	config, err := cli.Rdb.ConfigGet(l.ctx, "databases").Result()
	if err != nil {
		return nil, err
	}

	totalDb, err := strconv.Atoi(config["databases"])
	if err != nil {
		return nil, err
	}

	return GeneralLogicResult{
		Info:    info,
		TotalDb: totalDb,
	}, nil
}
