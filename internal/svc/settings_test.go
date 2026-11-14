package svc

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/jmoiron/sqlx"
	"github.com/pressly/goose/v3"
	"github.com/tradalab/scorix/module/moduletest"
	"github.com/tradalab/scorix/module/store"
	_ "modernc.org/sqlite"

	"github.com/tradalab/rdms/idl/migration"
)

func migratedDB(t *testing.T) *sqlx.DB {
	t.Helper()
	db, err := sqlx.Open("sqlite", filepath.Join(t.TempDir(), "app.dat"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	if err := goose.SetDialect("sqlite3"); err != nil {
		t.Fatal(err)
	}
	goose.SetBaseFS(migration.FS)
	goose.SetLogger(goose.NopLogger())
	defer goose.SetBaseFS(nil)
	if err := goose.UpContext(context.Background(), db.DB, migration.Dir); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

func TestSettingsMoveToTheStoreOnceAndTheTableGoes(t *testing.T) {
	db := migratedDB(t)
	db.MustExec(`INSERT INTO "setting" ("key", "value") VALUES ('language', 'vi'), ('autoupdate', 'false'), ('secrets_migrated_v1', 'done')`)
	db.MustExec(`INSERT INTO "setting" ("key", "value", deleted_at) VALUES ('gone', 'x', CURRENT_TIMESTAMP)`)
	st := store.New()
	moduletest.Load(t, st, nil)
	ctx := context.Background()
	if err := st.Set(ctx, map[string]any{"key": "language", "value": "ja"}); err != nil {
		t.Fatal(err)
	}

	if err := migrateSettings(ctx, db, st); err != nil {
		t.Fatal(err)
	}
	for key, want := range map[string]any{"language": "ja", "autoupdate": "false", "secrets_migrated_v1": "done"} {
		if got, ok := st.Value(key); !ok || got != want {
			t.Errorf("%s = %v (%v), want %v", key, got, ok, want)
		}
	}
	if _, ok := st.Value("gone"); ok {
		t.Error("a deleted setting came back")
	}
	var tables int
	if err := db.Get(&tables, `SELECT COUNT(*) FROM sqlite_master WHERE name = 'setting'`); err != nil || tables != 0 {
		t.Fatalf("setting table still there: %d, %v", tables, err)
	}
	if err := migrateSettings(ctx, db, st); err != nil {
		t.Fatalf("second run: %v", err)
	}
}
