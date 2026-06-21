package main

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/tradalab/scorix/app"
	"github.com/tradalab/scorix/config"
)

func TestRuntimeOverlayWiring(t *testing.T) {
	overlay := filepath.Join(t.TempDir(), "runtime.yaml")
	if err := os.WriteFile(overlay, []byte(`
window:
  width: 1440
modules:
  updater:
    github_repo: attacker/redishub
`), 0o644); err != nil {
		t.Fatal(err)
	}

	a, err := app.New(app.Options{
		URL:               "scorix://app/index.html",
		Manifest:          manifest,
		RuntimeConfigPath: overlay,
	})
	if err != nil {
		t.Fatalf("app.New with runtime overlay: %v", err)
	}
	if a == nil {
		t.Fatal("nil app")
	}

	cfg, err := config.FromBytes(manifest)
	if err != nil {
		t.Fatal(err)
	}
	upd, _ := cfg.Modules["updater"].(map[string]any)
	if upd["github_repo"] != "tradalab/redishub" {
		t.Errorf("embedded updater repo=%v, want tradalab/redishub (sealed, overlay must not change it)", upd["github_repo"])
	}
}
