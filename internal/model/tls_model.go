package model

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"

	scorixsqlx "github.com/tradalab/scorix/module/sqlx"
)

var _ TlsModel = (*customTlsModel)(nil)

type (
	TlsModel interface {
		tlsModel
	}

	customTlsModel struct {
		*defaultTlsModel
	}
)

func NewTlsModel(conn func() scorixsqlx.Conn) TlsModel {
	return &customTlsModel{
		defaultTlsModel: newDefaultTlsModel(conn),
	}
}

func (t *Tls) BuildTlsConfig() (*tls.Config, error) {
	cfg := &tls.Config{
		InsecureSkipVerify: t.Verify == 0,
	}

	if t.UseSni > 0 {
		cfg.ServerName = t.ServerName
	}

	if t.CaCert != "" {
		caCertPool := x509.NewCertPool()
		if ok := caCertPool.AppendCertsFromPEM([]byte(t.CaCert)); !ok {
			return nil, fmt.Errorf("failed to append ca cert")
		}
		cfg.RootCAs = caCertPool
	}

	if t.ClientAuth > 0 {
		if t.Cert != "" && t.Key != "" {
			cert, err := tls.X509KeyPair([]byte(t.Cert), []byte(t.Key))
			if err != nil {
				return nil, fmt.Errorf("failed to load client cert: %w", err)
			}
			cfg.Certificates = []tls.Certificate{cert}
		} else {
			return nil, fmt.Errorf("client auth enabled but cert/key is missing")
		}
	}

	return cfg, nil
}
