package model

import (
	"net"
	"strconv"

	scorixsqlx "github.com/tradalab/scorix/module/sqlx"
)

var _ ProxyModel = (*customProxyModel)(nil)

type (
	ProxyModel interface {
		proxyModel
	}

	customProxyModel struct {
		*defaultProxyModel
	}
)

func NewProxyModel(conn func() scorixsqlx.Conn) ProxyModel {
	return &customProxyModel{
		defaultProxyModel: newDefaultProxyModel(conn),
	}
}

func (p *Proxy) Addr() string {
	return net.JoinHostPort(p.Host, strconv.Itoa(int(p.Port)))
}
