package client

import (
	"context"
	"time"

	"github.com/tradalab/rdms/app/svc"
)

type KeyTtlUpdateLogicArgs struct {
	DatabaseId    string `json:"database_id" validate:"required"`
	DatabaseIndex int    `json:"database_index" validate:""`
	KeyName       string `json:"key_name" validate:"required"`
	KeyTtl        int64  `json:"key_ttl" validate:"required"`
}

type KeyTtlUpdateLogicResult struct{}

type ClientKeyTtlUpdateLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewClientKeyTtlUpdateLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ClientKeyTtlUpdateLogic {
	return &ClientKeyTtlUpdateLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ClientKeyTtlUpdateLogic) ClientKeyTtlUpdateLogic(params KeyTtlUpdateLogicArgs) (interface{}, error) {
	cli, err := l.svcCtx.Cli.Get(params.DatabaseId, params.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	if params.KeyTtl >= 0 {
		err = cli.Rdb.Expire(l.ctx, params.KeyName, time.Duration(params.KeyTtl)).Err()
		if err != nil {
			return nil, err
		}
	} else if params.KeyTtl < 0 {
		err = cli.Rdb.Persist(l.ctx, params.KeyName).Err()
		if err != nil {
			return nil, err
		}
	}

	return nil, nil
}
