package model

import (
	"context"
	"database/sql"
	"log"

	scorixsecrets "github.com/tradalab/scorix/secrets"
)

var secretCodec *scorixsecrets.Store

func SetSecretCodec(s *scorixsecrets.Store) { secretCodec = s }

func sealSecret(v string) (string, error) {
	if secretCodec == nil {
		return v, nil
	}
	if scorixsecrets.IsEncrypted(v) {
		return v, nil
	}
	return secretCodec.EncryptString(v)
}

func openSecret(v string) (string, error) {
	if secretCodec == nil {
		return v, nil
	}
	for scorixsecrets.IsEncrypted(v) {
		dec, err := secretCodec.DecryptString(v)
		if err != nil {
			log.Printf("secrets: leaving value sealed (decrypt failed): %v", err)
			return v, nil
		}
		if dec == v {
			break
		}
		v = dec
	}
	return v, nil
}

func sealConnection(d *Connection) (*Connection, error) {
	c := *d
	var err error
	if c.Password, err = sealSecret(c.Password); err != nil {
		return nil, err
	}
	if c.SentinelPassword, err = sealSecret(c.SentinelPassword); err != nil {
		return nil, err
	}
	return &c, nil
}

func openConnection(d *Connection) error {
	var err error
	if d.Password, err = openSecret(d.Password); err != nil {
		return err
	}
	d.SentinelPassword, err = openSecret(d.SentinelPassword)
	return err
}

func sealSsh(d *Ssh) (*Ssh, error) {
	c := *d
	var err error
	if c.Password, err = sealSecret(c.Password); err != nil {
		return nil, err
	}
	if c.PrivateKey, err = sealSecret(c.PrivateKey); err != nil {
		return nil, err
	}
	if c.Passphrase, err = sealSecret(c.Passphrase); err != nil {
		return nil, err
	}
	return &c, nil
}

func openSsh(d *Ssh) error {
	var err error
	if d.Password, err = openSecret(d.Password); err != nil {
		return err
	}
	if d.PrivateKey, err = openSecret(d.PrivateKey); err != nil {
		return err
	}
	d.Passphrase, err = openSecret(d.Passphrase)
	return err
}

func sealTls(d *Tls) (*Tls, error) {
	c := *d
	var err error
	if c.Key, err = sealSecret(c.Key); err != nil {
		return nil, err
	}
	return &c, nil
}

func openTls(d *Tls) error {
	var err error
	d.Key, err = openSecret(d.Key)
	return err
}

func sealProxy(d *Proxy) (*Proxy, error) {
	c := *d
	var err error
	if c.Password, err = sealSecret(c.Password); err != nil {
		return nil, err
	}
	return &c, nil
}

func openProxy(d *Proxy) error {
	var err error
	d.Password, err = openSecret(d.Password)
	return err
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
