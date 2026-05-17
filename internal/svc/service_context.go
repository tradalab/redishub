package svc

import (
	"github.com/tradalab/rdms/internal/config"
	// scorix:model:imports:start
	"github.com/tradalab/rdms/etc"
	"github.com/tradalab/rdms/internal/model"
	scorixsqlx "github.com/tradalab/scorix/module/sqlx"
	// scorix:model:imports:end
	scorix "github.com/tradalab/scorix/kernel"
	scorix_config "github.com/tradalab/scorix/kernel/core/config"
)

type ServiceContext struct {
	Cfg          *config.Config
	App          scorix.App
	RedisManager *ClientManager
	// scorix:model:fields:start
	ConnectionModel model.ConnectionModel
	SshModel        model.SshModel
	TlsModel        model.TlsModel
	ProxyModel      model.ProxyModel
	GroupModel      model.GroupModel
	SettingModel    model.SettingModel
	// scorix:model:fields:end
}

func NewServiceContext(cfg *scorix_config.Config, app scorix.App) *ServiceContext {
	// scorix:model:init:start
	sqlxMod := scorixsqlx.New(scorixsqlx.WithSchema(etc.SchemaSQL))
	app.Modules().Register(sqlxMod)
	// scorix:model:init:end

	return &ServiceContext{
		Cfg:          &config.Config{Config: *cfg},
		App:          app,
		RedisManager: NewManager(),
		// scorix:model:assigns:start
		ConnectionModel: model.NewConnectionModel(sqlxMod.Conn),
		SshModel:        model.NewSshModel(sqlxMod.Conn),
		TlsModel:        model.NewTlsModel(sqlxMod.Conn),
		ProxyModel:      model.NewProxyModel(sqlxMod.Conn),
		GroupModel:      model.NewGroupModel(sqlxMod.Conn),
		SettingModel:    model.NewSettingModel(sqlxMod.Conn),
		// scorix:model:assigns:end
	}
}
