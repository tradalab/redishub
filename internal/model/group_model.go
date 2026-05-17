package model

import scorixsqlx "github.com/tradalab/scorix/module/sqlx"

var _ GroupModel = (*customGroupModel)(nil)

type (
	GroupModel interface {
		groupModel
	}

	customGroupModel struct {
		*defaultGroupModel
	}
)

func NewGroupModel(conn func() scorixsqlx.Conn) GroupModel {
	return &customGroupModel{
		defaultGroupModel: newDefaultGroupModel(conn),
	}
}
