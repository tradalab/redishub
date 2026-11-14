package svc

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	scorixsqlx "github.com/tradalab/scorix/module/sqlx"
)

type settingRow struct {
	Key   string `db:"key"`
	Value string `db:"value"`
}

type settingStore interface {
	Value(key string) (any, bool)
	Set(ctx context.Context, req map[string]any) error
}

func (s *ServiceContext) MigrateSettings(ctx context.Context) error {
	return migrateSettings(ctx, s.sqlx.Conn(), s.Store)
}

func migrateSettings(ctx context.Context, db scorixsqlx.Conn, st settingStore) error {
	var tables int
	if err := sqlx.GetContext(ctx, db, &tables, `SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'setting'`); err != nil {
		return fmt.Errorf("look for the setting table: %w", err)
	}
	if tables == 0 {
		return nil
	}
	var rows []settingRow
	if err := sqlx.SelectContext(ctx, db, &rows, `SELECT "key", "value" FROM "setting" WHERE deleted_at IS NULL`); err != nil {
		return fmt.Errorf("read settings: %w", err)
	}
	for _, r := range rows {
		if _, ok := st.Value(r.Key); ok {
			continue
		}
		if err := st.Set(ctx, map[string]any{"key": r.Key, "value": r.Value}); err != nil {
			return fmt.Errorf("move setting %s: %w", r.Key, err)
		}
	}
	if _, err := db.ExecContext(ctx, `DROP TABLE "setting"`); err != nil {
		return fmt.Errorf("drop the setting table: %w", err)
	}
	return nil
}
