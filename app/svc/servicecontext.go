package svc

import (
	"github.com/tradalab/rdms/app/dal/do"
	"github.com/tradalab/scorix"
	"github.com/tradalab/scorix/core/config"
	"github.com/tradalab/scorix/core/extension"
	gormext "github.com/tradalab/scorix/core/extensions/gorm"
	"gorm.io/gorm"
)

type ServiceContext struct {
	Cfg *config.Config
	App scorix.App
	Db  *gorm.DB
	Cli *ClientManager
}

func NewServiceContext(cfg *config.Config, app scorix.App) *ServiceContext {
	gext, ok := extension.GetExt[*gormext.GormExt]("gorm")
	if !ok {
		panic("gorm extension not found")
	}

	err := gext.DB().Transaction(func(tx *gorm.DB) error {
		return tx.Migrator().AutoMigrate(do.MigrationDst...)
	})
	if err != nil {
		panic(err)
	}

	return &ServiceContext{
		Cfg: cfg,
		App: app,
		Db:  gext.DB(),
		Cli: NewManager(),
	}
}
