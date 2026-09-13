package migration

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

// read_only shipped after the app did. It used to reach existing databases
// through a hand-rolled ALTER that ran on every launch; goose records who has
// had it, so this runs once. Still guarded: the baseline already creates the
// column, so a fresh install arrives with nothing to do.
func init() {
	goose.AddNamedMigrationContext("00002_connection_read_only.go", upConnectionReadOnly, downConnectionReadOnly)
}

func upConnectionReadOnly(ctx context.Context, tx *sql.Tx) error {
	return addColumn(ctx, tx, "connection", "read_only", "INTEGER NOT NULL DEFAULT 0")
}

// No down: it would lose which connections the user marked read-only.
func downConnectionReadOnly(context.Context, *sql.Tx) error { return nil }
