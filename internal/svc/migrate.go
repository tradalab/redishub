package svc

import (
	"context"
	"fmt"
)

func (s *ServiceContext) MigrateSchema(ctx context.Context) error {
	db := s.sqlx.DB()
	if db == nil {
		return fmt.Errorf("sqlx db not ready")
	}

	var n int
	if err := db.GetContext(ctx, &n,
		`SELECT COUNT(*) FROM pragma_table_info('connection') WHERE name = 'read_only'`); err != nil {
		return fmt.Errorf("inspect connection columns: %w", err)
	}
	if n == 0 {
		if _, err := db.ExecContext(ctx,
			`ALTER TABLE "connection" ADD COLUMN read_only INTEGER NOT NULL DEFAULT 0`); err != nil {
			return fmt.Errorf("add connection.read_only: %w", err)
		}
	}
	return nil
}
