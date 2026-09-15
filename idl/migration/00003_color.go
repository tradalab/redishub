package migration

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
	scorixsqlx "github.com/tradalab/scorix/module/sqlx"
)

func init() {
	goose.AddNamedMigrationContext("00003_color.go", upColor, downColor)
}

func upColor(ctx context.Context, tx *sql.Tx) error {
	for _, table := range []string{"connection", "group"} {
		if err := scorixsqlx.AddColumn(ctx, tx, table, "color", "TEXT NOT NULL DEFAULT ''"); err != nil {
			return err
		}
	}
	return nil
}

// No down: it would erase the colors people picked.
func downColor(context.Context, *sql.Tx) error { return nil }
