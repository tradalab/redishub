package migration

import (
	"context"
	"database/sql"
	"path/filepath"
	"regexp"
	"strings"
	"testing"

	"github.com/pressly/goose/v3"
	_ "modernc.org/sqlite"

	"github.com/tradalab/rdms/idl"
)

// The connection table exactly as a machine that installed a build before
// read_only still holds it: every other column present, that one absent. Frozen
// on purpose - it is the input the migration has to cope with, so it must not
// drift when idl/schema.sql changes.
//
// A minimal stand-in is not good enough here, and the first version of this test
// proved it: the baseline carries the repair UPDATEs from schema.sql, which name
// columns a stripped-down fixture does not have, and the whole chain aborted.
const preReadOnlyConnectionDDL = `
CREATE TABLE "connection" (
    id                TEXT PRIMARY KEY,
    mode              TEXT NOT NULL DEFAULT 'standalone',
    name              TEXT NOT NULL DEFAULT '',
    network           TEXT NOT NULL DEFAULT 'tcp',
    host              TEXT NOT NULL DEFAULT '',
    port              INTEGER NOT NULL DEFAULT 6379,
    addrs             TEXT NOT NULL DEFAULT '',
    sentinel_master   TEXT NOT NULL DEFAULT '',
    sentinel_username TEXT NOT NULL DEFAULT '',
    sentinel_password TEXT NOT NULL DEFAULT '',
    sock              TEXT NOT NULL DEFAULT '',
    username          TEXT NOT NULL DEFAULT '',
    password          TEXT NOT NULL DEFAULT '',
    addr_mapping      TEXT NOT NULL DEFAULT '',
    last_db           INTEGER NOT NULL DEFAULT 0,
    exec_timeout      INTEGER NOT NULL DEFAULT 60,
    dial_timeout      INTEGER NOT NULL DEFAULT 60,
    key_size          INTEGER NOT NULL DEFAULT 10000,
    group_id          TEXT NOT NULL DEFAULT '',
    ssh_enable        INTEGER NOT NULL DEFAULT 0,
    ssh_id            TEXT NOT NULL DEFAULT '',
    proxy_enable      INTEGER NOT NULL DEFAULT 0,
    proxy_id          TEXT NOT NULL DEFAULT '',
    tls_enable        INTEGER NOT NULL DEFAULT 0,
    tls_id            TEXT NOT NULL DEFAULT '',
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at        DATETIME
)`

// The upgrade path. Before goose this ran on every launch as a hand-rolled ALTER
// in svc.MigrateSchema; the guarantee has to survive the move.
func TestExistingDatabaseGainsReadOnly(t *testing.T) {
	db := openDB(t)
	if _, err := db.Exec(preReadOnlyConnectionDDL); err != nil {
		t.Fatal(err)
	}

	if err := runMigrations(t, db); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	if !columnsOf(t, db, "connection")["read_only"] {
		t.Error("connection.read_only missing after migrating an older database")
	}
}

// The fresh-install path: the baseline creates every column the schema declares,
// the column migration finds nothing to do, and a second run changes nothing.
func TestFreshDatabaseGetsEveryColumn(t *testing.T) {
	db := openDB(t)
	if err := runMigrations(t, db); err != nil {
		t.Fatalf("first migrate: %v", err)
	}
	before := columnsOf(t, db, "connection")
	for _, want := range schemaColumns(t, "connection") {
		if !before[want] {
			t.Errorf("connection.%s missing on a fresh install - the baseline does not create it", want)
		}
	}

	if err := runMigrations(t, db); err != nil {
		t.Fatalf("second migrate: %v", err)
	}
	if after := columnsOf(t, db, "connection"); len(before) != len(after) {
		t.Errorf("fresh DB changed shape on the second run: %d columns -> %d", len(before), len(after))
	}
}

// runMigrations drives goose exactly as scorix's sqlx module does.
func runMigrations(t *testing.T, db *sql.DB) error {
	t.Helper()
	if err := goose.SetDialect("sqlite3"); err != nil {
		t.Fatal(err)
	}
	goose.SetBaseFS(FS)
	goose.SetLogger(goose.NopLogger())
	defer goose.SetBaseFS(nil)
	return goose.UpContext(context.Background(), db, Dir)
}

func openDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

func columnsOf(t *testing.T, db *sql.DB, table string) map[string]bool {
	t.Helper()
	rows, err := db.Query(`SELECT name FROM pragma_table_info(?)`, table)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	out := map[string]bool{}
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			t.Fatal(err)
		}
		out[name] = true
	}
	return out
}

var createTableRe = regexp.MustCompile(`(?s)CREATE TABLE IF NOT EXISTS\s+"?([A-Za-z_]+)"?\s*\((.*?)\n\);`)

// Reads the column names the schema declares for one table. Parsing SQL is a bad
// idea in the app and a fine one in a test: a parser bug here is a red test, not
// DDL running against someone's data.
func schemaColumns(t *testing.T, table string) []string {
	t.Helper()
	for _, m := range createTableRe.FindAllStringSubmatch(idl.SchemaSQL, -1) {
		if m[1] != table {
			continue
		}
		var cols []string
		for _, line := range strings.Split(m[2], "\n") {
			line = strings.TrimSpace(line)
			if line == "" || strings.HasPrefix(line, "--") {
				continue
			}
			name := strings.Trim(strings.Fields(line)[0], `",`)
			switch strings.ToUpper(name) {
			case "PRIMARY", "FOREIGN", "UNIQUE", "CHECK", "CONSTRAINT":
				continue
			}
			cols = append(cols, name)
		}
		if len(cols) == 0 {
			t.Fatalf("parsed no columns for %s - the schema parser in this test is broken", table)
		}
		return cols
	}
	t.Fatalf("idl/schema.sql declares no table %q", table)
	return nil
}
