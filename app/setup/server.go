//go:build server

package setup

import (
	scorix "github.com/tradalab/scorix/kernel"
)

func Desktop(app scorix.App, icon []byte) {
	// headless server mode - no systray, browser, dialog, clipboard module
}
