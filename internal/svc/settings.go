package svc

import (
	"context"

	"github.com/tradalab/scorix/module/store"
)

func (s *ServiceContext) MigrateSettings(ctx context.Context) error {
	return migrateSettings(ctx, s.sqlx.Conn(), s.Store)
}

func migrateSettings(ctx context.Context, db store.TableDB, st *store.StoreModule) error {
	_, err := st.ImportTable(ctx, db, "setting")
	return err
}
