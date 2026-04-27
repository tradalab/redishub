package main

import (
	"embed"

	"github.com/tradalab/rdms/app/handler"
	"github.com/tradalab/rdms/app/setup"
	"github.com/tradalab/rdms/app/svc"
	scorix "github.com/tradalab/scorix/kernel"
)

//go:embed all:.scorix/dist
var embeddedPublic embed.FS

//go:embed assets/icon.ico
var icon []byte

//go:embed etc/app.yaml
var configFile []byte

func main() {
	app := scorix.MustNew(
		[]scorix.InitOption{
			scorix.WithConfigData(configFile),
		},
		scorix.WithAssets(embeddedPublic, ".scorix/dist"),
	)

	// Setup desktop-specific components (systray, browser module) if not in server mode
	setup.Desktop(app, icon)

	//logger.Info("init svcCtx")
	svcCtx := svc.NewServiceContext(app.Cfg(), app)

	//logger.Info("inject logic")
	handler.RegisterHandlers(svcCtx)

	if err := app.Run(); err != nil {
		panic(err)
	}
}
