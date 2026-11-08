package svc

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	scorixsecrets "github.com/tradalab/scorix/secrets"

	"github.com/tradalab/rdms/internal/model"
)

const (
	secretsService      = "com.tradalab.redishub"
	secretsKeyEnv       = "SCORIX_MASTER_KEY"
	settingSecretsMigKy = "secrets_migrated_v1"
)

func initSecretCodec() {
	store, err := scorixsecrets.OpenFromEnv(secretsService, secretsKeyEnv)
	if err != nil {
		panic(fmt.Sprintf(
			"redishub: cannot initialize credential encryption: %v\n"+
				"(unlock the OS keychain, or provide a base64 32-byte key via %s)",
			err, secretsKeyEnv))
	}
	model.SetSecretCodec(store)
}

func (s *ServiceContext) MigrateSecrets(ctx context.Context) error {
	if _, err := s.SettingModel.FindOneByKey(ctx, settingSecretsMigKy); err == nil {
		return nil
	} else if !errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("check migration flag: %w", err)
	}

	if err := scorixsecrets.Reseal(ctx, s.ConnectionModel.FindAll, s.ConnectionModel.Update); err != nil {
		return fmt.Errorf("re-seal connections: %w", err)
	}
	if err := scorixsecrets.Reseal(ctx, s.SshModel.FindAll, s.SshModel.Update); err != nil {
		return fmt.Errorf("re-seal ssh: %w", err)
	}
	if err := scorixsecrets.Reseal(ctx, s.TlsModel.FindAll, s.TlsModel.Update); err != nil {
		return fmt.Errorf("re-seal tls: %w", err)
	}
	if err := scorixsecrets.Reseal(ctx, s.ProxyModel.FindAll, s.ProxyModel.Update); err != nil {
		return fmt.Errorf("re-seal proxy: %w", err)
	}

	_, err := s.SettingModel.Insert(ctx, &model.Setting{Key: settingSecretsMigKy, Value: "done"})
	return err
}
