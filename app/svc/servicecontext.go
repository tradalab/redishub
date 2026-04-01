package svc

import (
	"github.com/tradalab/rdms/app/dal/do"
	scorix "github.com/tradalab/scorix/kernel"
	"github.com/tradalab/scorix/kernel/core/config"
	gormmod "github.com/tradalab/scorix/module/gorm"
)

type ServiceContext struct {
	Cfg     *config.Config
	App     scorix.App
	GormMod *gormmod.GormModule
	Cli     *ClientManager
}

func NewServiceContext(cfg *config.Config, app scorix.App) *ServiceContext {
	_gormmod := gormmod.New()
	_gormmod.RegisterModel(do.MigrationDst...)
	app.Modules().Register(_gormmod)

	return &ServiceContext{
		Cfg:     cfg,
		App:     app,
		Cli:     NewManager(_gormmod),
		GormMod: _gormmod,
	}
}
