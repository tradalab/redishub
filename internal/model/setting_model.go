package model

import scorixsqlx "github.com/tradalab/scorix/module/sqlx"

var _ SettingModel = (*customSettingModel)(nil)

type (
	SettingModel interface {
		settingModel
	}

	customSettingModel struct {
		*defaultSettingModel
	}
)

func NewSettingModel(conn func() scorixsqlx.Conn) SettingModel {
	return &customSettingModel{
		defaultSettingModel: newDefaultSettingModel(conn),
	}
}
