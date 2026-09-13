package migration

import (
	"context"
	"database/sql"
	"fmt"
)

// Guarded DDL: SQLite has no ADD COLUMN IF NOT EXISTS, and one migration has to
// be right on a fresh install and an older database at once.
//
// Temporary. scorix exports the same helpers as sqlx.AddColumn since the release
// after v0.27.1; drop this file at the next go.mod bump.

func hasTable(ctx context.Context, tx *sql.Tx, table string) (bool, error) {
	var n int
	if err := tx.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?`, table).Scan(&n); err != nil {
		return false, fmt.Errorf("inspect table %s: %w", table, err)
	}
	return n > 0, nil
}

func hasColumn(ctx context.Context, tx *sql.Tx, table, column string) (bool, error) {
	var n int
	if err := tx.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM pragma_table_info(?) WHERE name = ?`, table, column).Scan(&n); err != nil {
		return false, fmt.Errorf("inspect %s.%s: %w", table, column, err)
	}
	return n > 0, nil
}

// A missing table is skipped rather than failed: ALTER TABLE would abort the
// whole chain over a table a later migration is about to create.
func addColumn(ctx context.Context, tx *sql.Tx, table, column, ddl string) error {
	has, err := hasColumn(ctx, tx, table, column)
	if err != nil || has {
		return err
	}
	exists, err := hasTable(ctx, tx, table)
	if err != nil || !exists {
		return err
	}
	if _, err := tx.ExecContext(ctx,
		fmt.Sprintf("ALTER TABLE %q ADD COLUMN %q %s", table, column, ddl)); err != nil {
		return fmt.Errorf("add %s.%s: %w", table, column, err)
	}
	return nil
}
