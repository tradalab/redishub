package model

import scorixsqlx "github.com/tradalab/scorix/module/sqlx"

var _ SearchPresetModel = (*customSearchPresetModel)(nil)

type (
	SearchPresetModel interface {
		searchPresetModel
	}

	customSearchPresetModel struct {
		*defaultSearchPresetModel
	}
)

func NewSearchPresetModel(conn func() scorixsqlx.Conn) SearchPresetModel {
	return &customSearchPresetModel{
		defaultSearchPresetModel: newDefaultSearchPresetModel(conn),
	}
}
