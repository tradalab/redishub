package model

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"slices"

	scorixsecrets "github.com/tradalab/scorix/secrets"
)

var secretCodec *scorixsecrets.Store

func SetSecretCodec(s *scorixsecrets.Store) { secretCodec = s }

func opened(err error) error {
	if errors.Is(err, scorixsecrets.ErrUnreadable) {
		log.Printf("secrets: blanking fields that do not open on this machine: %v", err)
		return nil
	}
	return err
}

func connectionSecrets(c *Connection) []*string { return []*string{&c.Password, &c.SentinelPassword} }
func sshSecrets(c *Ssh) []*string               { return []*string{&c.Password, &c.PrivateKey, &c.Passphrase} }
func tlsSecrets(c *Tls) []*string               { return []*string{&c.Key} }
func proxySecrets(c *Proxy) []*string           { return []*string{&c.Password} }

func sealConnection(d *Connection) (*Connection, error) {
	c := *d
	return &c, secretCodec.SealFields(connectionSecrets(&c)...)
}

func openConnection(d *Connection) error {
	return opened(secretCodec.OpenFields(connectionSecrets(d)...))
}

func sealSsh(d *Ssh) (*Ssh, error) {
	c := *d
	return &c, secretCodec.SealFields(sshSecrets(&c)...)
}

func openSsh(d *Ssh) error {
	return opened(secretCodec.OpenFields(sshSecrets(d)...))
}

func sealTls(d *Tls) (*Tls, error) {
	c := *d
	return &c, secretCodec.SealFields(tlsSecrets(&c)...)
}

func openTls(d *Tls) error {
	return opened(secretCodec.OpenFields(tlsSecrets(d)...))
}

func sealProxy(d *Proxy) (*Proxy, error) {
	c := *d
	return &c, secretCodec.SealFields(proxySecrets(&c)...)
}

func openProxy(d *Proxy) error {
	return opened(secretCodec.OpenFields(proxySecrets(d)...))
}

func unreadable(v string) bool {
	return secretCodec.OpenFields(&v) != nil
}

func keepUnreadable[T any](ctx context.Context, find func(context.Context, string) (*T, error), id string, secrets func(*T) []*string, next *T) error {
	fields := secrets(next)
	if secretCodec == nil || !slices.ContainsFunc(fields, func(f *string) bool { return *f == "" }) {
		return nil
	}
	stored, err := find(ctx, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	for i, f := range secrets(stored) {
		if *fields[i] == "" && unreadable(*f) {
			*fields[i] = *f
		}
	}
	return nil
}

func (m *customConnectionModel) Insert(ctx context.Context, data *Connection) (sql.Result, error) {
	enc, err := sealConnection(data)
	if err != nil {
		return nil, err
	}
	res, err := m.defaultConnectionModel.Insert(ctx, enc)
	if err == nil {
		data.ID, data.CreatedAt, data.UpdatedAt = enc.ID, enc.CreatedAt, enc.UpdatedAt
	}
	return res, err
}

func (m *customConnectionModel) Update(ctx context.Context, data *Connection) error {
	enc, err := sealConnection(data)
	if err != nil {
		return err
	}
	if err := keepUnreadable(ctx, m.defaultConnectionModel.FindOne, enc.ID, connectionSecrets, enc); err != nil {
		return err
	}
	if err := m.defaultConnectionModel.Update(ctx, enc); err != nil {
		return err
	}
	data.UpdatedAt = enc.UpdatedAt
	return nil
}

func (m *customConnectionModel) FindOne(ctx context.Context, id string) (*Connection, error) {
	r, err := m.defaultConnectionModel.FindOne(ctx, id)
	if err != nil {
		return r, err
	}
	return r, openConnection(r)
}

func (m *customConnectionModel) FindMany(ctx context.Context, ids []string) ([]*Connection, error) {
	rs, err := m.defaultConnectionModel.FindMany(ctx, ids)
	if err != nil {
		return rs, err
	}
	for _, r := range rs {
		if err := openConnection(r); err != nil {
			return rs, err
		}
	}
	return rs, nil
}

func (m *customConnectionModel) FindAll(ctx context.Context) ([]*Connection, error) {
	rs, err := m.defaultConnectionModel.FindAll(ctx)
	if err != nil {
		return rs, err
	}
	for _, r := range rs {
		if err := openConnection(r); err != nil {
			return rs, err
		}
	}
	return rs, nil
}

func (m *customSshModel) Insert(ctx context.Context, data *Ssh) (sql.Result, error) {
	enc, err := sealSsh(data)
	if err != nil {
		return nil, err
	}
	res, err := m.defaultSshModel.Insert(ctx, enc)
	if err == nil {
		data.ID, data.CreatedAt, data.UpdatedAt = enc.ID, enc.CreatedAt, enc.UpdatedAt
	}
	return res, err
}

func (m *customSshModel) Update(ctx context.Context, data *Ssh) error {
	enc, err := sealSsh(data)
	if err != nil {
		return err
	}
	if err := keepUnreadable(ctx, m.defaultSshModel.FindOne, enc.ID, sshSecrets, enc); err != nil {
		return err
	}
	if err := m.defaultSshModel.Update(ctx, enc); err != nil {
		return err
	}
	data.UpdatedAt = enc.UpdatedAt
	return nil
}

func (m *customSshModel) FindOne(ctx context.Context, id string) (*Ssh, error) {
	r, err := m.defaultSshModel.FindOne(ctx, id)
	if err != nil {
		return r, err
	}
	return r, openSsh(r)
}

func (m *customSshModel) FindMany(ctx context.Context, ids []string) ([]*Ssh, error) {
	rs, err := m.defaultSshModel.FindMany(ctx, ids)
	if err != nil {
		return rs, err
	}
	for _, r := range rs {
		if err := openSsh(r); err != nil {
			return rs, err
		}
	}
	return rs, nil
}

func (m *customSshModel) FindAll(ctx context.Context) ([]*Ssh, error) {
	rs, err := m.defaultSshModel.FindAll(ctx)
	if err != nil {
		return rs, err
	}
	for _, r := range rs {
		if err := openSsh(r); err != nil {
			return rs, err
		}
	}
	return rs, nil
}

func (m *customTlsModel) Insert(ctx context.Context, data *Tls) (sql.Result, error) {
	enc, err := sealTls(data)
	if err != nil {
		return nil, err
	}
	res, err := m.defaultTlsModel.Insert(ctx, enc)
	if err == nil {
		data.ID, data.CreatedAt, data.UpdatedAt = enc.ID, enc.CreatedAt, enc.UpdatedAt
	}
	return res, err
}

func (m *customTlsModel) Update(ctx context.Context, data *Tls) error {
	enc, err := sealTls(data)
	if err != nil {
		return err
	}
	if err := keepUnreadable(ctx, m.defaultTlsModel.FindOne, enc.ID, tlsSecrets, enc); err != nil {
		return err
	}
	if err := m.defaultTlsModel.Update(ctx, enc); err != nil {
		return err
	}
	data.UpdatedAt = enc.UpdatedAt
	return nil
}

func (m *customTlsModel) FindOne(ctx context.Context, id string) (*Tls, error) {
	r, err := m.defaultTlsModel.FindOne(ctx, id)
	if err != nil {
		return r, err
	}
	return r, openTls(r)
}

func (m *customTlsModel) FindMany(ctx context.Context, ids []string) ([]*Tls, error) {
	rs, err := m.defaultTlsModel.FindMany(ctx, ids)
	if err != nil {
		return rs, err
	}
	for _, r := range rs {
		if err := openTls(r); err != nil {
			return rs, err
		}
	}
	return rs, nil
}

func (m *customTlsModel) FindAll(ctx context.Context) ([]*Tls, error) {
	rs, err := m.defaultTlsModel.FindAll(ctx)
	if err != nil {
		return rs, err
	}
	for _, r := range rs {
		if err := openTls(r); err != nil {
			return rs, err
		}
	}
	return rs, nil
}

func (m *customProxyModel) Insert(ctx context.Context, data *Proxy) (sql.Result, error) {
	enc, err := sealProxy(data)
	if err != nil {
		return nil, err
	}
	res, err := m.defaultProxyModel.Insert(ctx, enc)
	if err == nil {
		data.ID, data.CreatedAt, data.UpdatedAt = enc.ID, enc.CreatedAt, enc.UpdatedAt
	}
	return res, err
}

func (m *customProxyModel) Update(ctx context.Context, data *Proxy) error {
	enc, err := sealProxy(data)
	if err != nil {
		return err
	}
	if err := keepUnreadable(ctx, m.defaultProxyModel.FindOne, enc.ID, proxySecrets, enc); err != nil {
		return err
	}
	if err := m.defaultProxyModel.Update(ctx, enc); err != nil {
		return err
	}
	data.UpdatedAt = enc.UpdatedAt
	return nil
}

func (m *customProxyModel) FindOne(ctx context.Context, id string) (*Proxy, error) {
	r, err := m.defaultProxyModel.FindOne(ctx, id)
	if err != nil {
		return r, err
	}
	return r, openProxy(r)
}

func (m *customProxyModel) FindMany(ctx context.Context, ids []string) ([]*Proxy, error) {
	rs, err := m.defaultProxyModel.FindMany(ctx, ids)
	if err != nil {
		return rs, err
	}
	for _, r := range rs {
		if err := openProxy(r); err != nil {
			return rs, err
		}
	}
	return rs, nil
}

func (m *customProxyModel) FindAll(ctx context.Context) ([]*Proxy, error) {
	rs, err := m.defaultProxyModel.FindAll(ctx)
	if err != nil {
		return rs, err
	}
	for _, r := range rs {
		if err := openProxy(r); err != nil {
			return rs, err
		}
	}
	return rs, nil
}
