package model

import (
	"net"
	"strconv"

	scorixsqlx "github.com/tradalab/scorix/module/sqlx"
)

var _ ConnectionModel = (*customConnectionModel)(nil)

type (
	ConnectionModel interface {
		connectionModel
	}

	customConnectionModel struct {
		*defaultConnectionModel
	}
)

func NewConnectionModel(conn func() scorixsqlx.Conn) ConnectionModel {
	return &customConnectionModel{
		defaultConnectionModel: newDefaultConnectionModel(conn),
	}
}

func (c *Connection) Addr() string {
	if (c.Mode == "sentinel" || c.Mode == "cluster") && c.Addrs != "" {
		return c.Addrs
	}
	return net.JoinHostPort(c.Host, strconv.Itoa(int(c.Port)))
}
