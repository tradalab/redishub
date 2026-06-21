package svc

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"

	scorixsecrets "github.com/tradalab/scorix/secrets"

	"github.com/tradalab/rdms/internal/model"
)

const (
	secretsService      = "com.tradalab.redishub"
	secretsKeyEnv       = "SCORIX_MASTER_KEY"
	settingSecretsMigKy = "secrets_migrated_v1"
)

func initSecretCodec() {
	var store *scorixsecrets.Store
	var err error
	if enc := os.Getenv(secretsKeyEnv); enc != "" {
		var key []byte
		key, err = decodeBase64Key(enc)
		if err == nil {
			store, err = scorixsecrets.NewWithKey(key)
		}
	} else {
		store, err = scorixsecrets.Open(secretsService)
	}
	if err != nil {
		panic(fmt.Sprintf(
			"redishub: cannot initialize credential encryption: %v\n"+
				"(unlock the OS keychain, or provide a base64 32-byte key via %s)",
			err, secretsKeyEnv))
	}
	model.SetSecretCodec(store)
}

func decodeBase64Key(s string) ([]byte, error) {
	key, err := scorixsecrets.DecodeKey(s)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", secretsKeyEnv, err)
	}
	return key, nil
}

func (s *ServiceContext) MigrateSecrets(ctx context.Context) error {
	if _, err := s.SettingModel.FindOneByKey(ctx, settingSecretsMigKy); err == nil {
		return nil
	} else if !errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("check migration flag: %w", err)
	}

	conns, err := s.ConnectionModel.FindAll(ctx)
	if err != nil {
		return err
	}
	for _, c := range conns {
		if err := s.ConnectionModel.Update(ctx, c); err != nil {
			return fmt.Errorf("re-seal connection %s: %w", c.ID, err)
		}
	}
	sshes, err := s.SshModel.FindAll(ctx)
	if err != nil {
		return err
	}
	for _, c := range sshes {
		if err := s.SshModel.Update(ctx, c); err != nil {
			return fmt.Errorf("re-seal ssh %s: %w", c.ID, err)
		}
	}
	tlses, err := s.TlsModel.FindAll(ctx)
	if err != nil {
		return err
	}
	for _, c := range tlses {
		if err := s.TlsModel.Update(ctx, c); err != nil {
			return fmt.Errorf("re-seal tls %s: %w", c.ID, err)
		}
	}
	proxies, err := s.ProxyModel.FindAll(ctx)
	if err != nil {
		return err
	}
	for _, c := range proxies {
		if err := s.ProxyModel.Update(ctx, c); err != nil {
			return fmt.Errorf("re-seal proxy %s: %w", c.ID, err)
		}
	}

	_, err = s.SettingModel.Insert(ctx, &model.Setting{Key: settingSecretsMigKy, Value: "done"})
	return err
}
