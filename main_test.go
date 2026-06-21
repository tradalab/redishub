package main

import (
	"testing"

	"github.com/tradalab/scorix/config"
)

func TestManifestValid(t *testing.T) {
	cfg, err := config.FromBytes(manifest)
	if err != nil {
		t.Fatalf("scorix.yaml invalid as manifest: %v", err)
	}
	if cfg.App.Version == "" {
		t.Error("app.version missing — updater current_version defaults from it")
	}

	upd, ok := cfg.Modules["updater"].(map[string]any)
	if !ok {
		t.Fatalf("modules.updater missing: %#v", cfg.Modules["updater"])
	}
	if upd["provider"] != "github" {
		t.Errorf("updater provider=%v, want github", upd["provider"])
	}
	if upd["github_repo"] != "tradalab/redishub" {
		t.Errorf("updater github_repo=%v", upd["github_repo"])
	}
	if _, has := upd["current_version"]; has {
		t.Error("modules.updater.current_version should be removed (defaults from app.version)")
	}
	if _, has := cfg.Modules["sqlx"]; has {
		t.Error("modules.sqlx should be removed (codegen-driven from scorix.yaml)")
	}
}
