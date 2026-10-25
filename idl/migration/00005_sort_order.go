package migration

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
	scorixsqlx "github.com/tradalab/scorix/module/sqlx"
)

func init() {
	goose.AddNamedMigrationContext("00005_sort_order.go", upSortOrder, downSortOrder)
}

func upSortOrder(ctx context.Context, tx *sql.Tx) error {
	for _, table := range []string{"connection", "group"} {
		if err := scorixsqlx.AddColumn(ctx, tx, table, "sort_order", "INTEGER NOT NULL DEFAULT 0"); err != nil {
			return err
		}
	}
	return nil
}

func downSortOrder(context.Context, *sql.Tx) error { return nil }
