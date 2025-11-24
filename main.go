package main

import (
	"embed"

	"github.com/energye/systray"
	"github.com/tradalab/rdms/app/handler"
	"github.com/tradalab/rdms/app/svc"
	"github.com/tradalab/scorix"
)

//go:embed .scorix/dist/*
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

	go systray.Run(
		func() {
			systray.SetIcon(icon)
			systray.SetTitle(app.Cfg().App.Name)
			systray.SetTooltip(app.Cfg().App.Name)

			systray.SetOnClick(func(menu systray.IMenu) { app.Show() })
			systray.SetOnDClick(func(menu systray.IMenu) { app.Show() })
			systray.SetOnRClick(func(menu systray.IMenu) {
				err := menu.ShowMenu()
				if err != nil {
					//ctx.Logger().Error(err.Error())
					return
				}
			})

			systray.AddMenuItem("Open", "Open Application").Click(func() { app.Show() })
			systray.AddMenuItem("Quit", "Quit Application").Click(func() { app.Close() })
		},
		func() {},
	)

	//logger.Info("init svcCtx")
	svcCtx := svc.NewServiceContext(app.Cfg(), app)

	//logger.Info("inject logic")
	handler.RegisterHandlers(svcCtx)

	if err := app.Run(); err != nil {
		panic(err)
	}
}
