package migration

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
	scorixsqlx "github.com/tradalab/scorix/module/sqlx"
)

func init() {
	goose.AddNamedMigrationContext("00006_ssh_host_key.go", upSshHostKey, downSshHostKey)
}

func upSshHostKey(ctx context.Context, tx *sql.Tx) error {
	return scorixsqlx.AddColumn(ctx, tx, "ssh", "host_key", "TEXT NOT NULL DEFAULT ''")
}

func downSshHostKey(context.Context, *sql.Tx) error { return nil }
