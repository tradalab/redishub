package migration

import (
	"context"
	"testing"

	"github.com/pressly/goose/v3"
)

func TestExistingDatabaseGainsTags(t *testing.T) {
	db := openDB(t)
	if err := goose.SetDialect("sqlite3"); err != nil {
		t.Fatal(err)
	}
	goose.SetBaseFS(FS)
	goose.SetLogger(goose.NopLogger())
	defer goose.SetBaseFS(nil)

	if err := goose.UpToContext(context.Background(), db, Dir, 3); err != nil {
		t.Fatalf("migrate to version 3: %v", err)
	}
	if columnsOf(t, db, "connection")["tags"] {
		t.Fatal("connection.tags already exists at version 3, so this no longer models an older install")
	}
	if _, err := db.Exec(`INSERT INTO "connection" (id, name) VALUES ('c1', 'old')`); err != nil {
		t.Fatal(err)
	}

	if err := runMigrations(t, db); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	var tags string
	if err := db.QueryRow(`SELECT tags FROM "connection" WHERE id = 'c1'`).Scan(&tags); err != nil {
		t.Fatalf("read tags of a row that predates the column: %v", err)
	}
	if tags != "[]" {
		t.Fatalf("existing row got tags %q, want []", tags)
	}
}
