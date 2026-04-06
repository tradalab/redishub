//go:build !server

package setup

import (
	scorix "github.com/tradalab/scorix/kernel"
	browsermod "github.com/tradalab/scorix/module/browser"
	systraymod "github.com/tradalab/scorix/module/systemtray"
	updatermod "github.com/tradalab/scorix/module/updater"
)

func Desktop(app scorix.App, icon []byte) {
	app.Modules().Register(browsermod.New())
	app.Modules().Register(updatermod.New())
	app.Modules().Register(systraymod.New(icon))
}
