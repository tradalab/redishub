package client

import (
	"context"
	"fmt"

	"github.com/tradalab/rdms/app/dal/do"
	"github.com/tradalab/rdms/app/svc"
)

type ConnectLogicArgs struct {
	DatabaseId    string `json:"database_id" validate:"required"`
	DatabaseIndex int    `json:"database_index" validate:""`
}

type ClientConnectLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewClientConnectLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ClientConnectLogic {
	return &ClientConnectLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ClientConnectLogic) ClientConnectLogic(params ConnectLogicArgs) (interface{}, error) {
	var database *do.DatabaseDO
	result := l.svcCtx.Db.WithContext(l.ctx).Model(&do.DatabaseDO{}).Where("id = ?", params.DatabaseId).Find(&database)
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, fmt.Errorf("database does not exist")
	}

	if database.LastDb != params.DatabaseIndex {
		l.svcCtx.Db.WithContext(l.ctx).Model(&do.DatabaseDO{}).Where("id = ?", params.DatabaseId).Updates(map[string]interface{}{"last_db": params.DatabaseIndex})
	}

	_, err := l.svcCtx.Cli.Add(database, params.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	return nil, nil
}
