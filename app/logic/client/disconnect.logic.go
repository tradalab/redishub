package client

import (
	"context"
	"fmt"

	"github.com/tradalab/rdms/app/dal/do"
	"github.com/tradalab/rdms/app/svc"
)

type DisconnectLogicArgs struct {
	ConnectionId string `json:"connection_id" validate:"required"`
	//DatabaseIndex int    `json:"database_index" validate:""`
}

type ClientDisconnectLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewClientDisconnectLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ClientDisconnectLogic {
	return &ClientDisconnectLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ClientDisconnectLogic) ClientDisconnectLogic(params DisconnectLogicArgs) (interface{}, error) {
	var database *do.ConnectionDO
	result := l.svcCtx.Db.WithContext(l.ctx).Model(&do.ConnectionDO{}).Where("id = ?", params.ConnectionId).Find(&database)
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, fmt.Errorf("database does not exist")
	}

	l.svcCtx.Cli.Remove(database.Id, database.LastDb)

	return database, nil
}
