package migration

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
	scorixsqlx "github.com/tradalab/scorix/module/sqlx"
)

func init() {
	goose.AddNamedMigrationContext("00004_connection_tags.go", upConnectionTags, downConnectionTags)
}

func upConnectionTags(ctx context.Context, tx *sql.Tx) error {
	return scorixsqlx.AddColumn(ctx, tx, "connection", "tags", "TEXT NOT NULL DEFAULT '[]'")
}

func downConnectionTags(context.Context, *sql.Tx) error { return nil }
