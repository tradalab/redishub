package migration

import (
	"context"
	"testing"

	"github.com/pressly/goose/v3"
)

func TestExistingDatabaseGainsColor(t *testing.T) {
	db := openDB(t)
	if err := goose.SetDialect("sqlite3"); err != nil {
		t.Fatal(err)
	}
	goose.SetBaseFS(FS)
	goose.SetLogger(goose.NopLogger())
	defer goose.SetBaseFS(nil)

	if err := goose.UpToContext(context.Background(), db, Dir, 2); err != nil {
		t.Fatalf("migrate to version 2: %v", err)
	}
	for _, table := range []string{"connection", "group"} {
		if columnsOf(t, db, table)["color"] {
			t.Fatalf("%s.color already exists at version 2, so this no longer models an older install", table)
		}
	}

	if err := runMigrations(t, db); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	for _, table := range []string{"connection", "group"} {
		if !columnsOf(t, db, table)["color"] {
			t.Errorf("%s.color missing after migrating an older database", table)
		}
	}
}

func TestFreshDatabaseGetsEveryGroupColumn(t *testing.T) {
	db := openDB(t)
	if err := runMigrations(t, db); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	got := columnsOf(t, db, "group")
	for _, want := range schemaColumns(t, "group") {
		if !got[want] {
			t.Errorf("group.%s missing on a fresh install", want)
		}
	}
}
