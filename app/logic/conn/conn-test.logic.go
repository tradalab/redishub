package conn

import (
	"context"

	"github.com/tradalab/rdms/app/dal/do"
	"github.com/tradalab/rdms/app/svc"
)

type ConnTestLogicArgs struct {
	do.ConnectionDO
}

type ConnTestLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewConnTestLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ConnTestLogic {
	return &ConnTestLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ConnTestLogic) ConnTestLogic(params ConnTestLogicArgs) (interface{}, error) {
	err := l.svcCtx.Cli.Test(&params.ConnectionDO, 0)
	if err != nil {
		return nil, err
	}

	return nil, nil
}
