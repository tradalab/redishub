package model

import (
	"context"
	"net"
	"strconv"
	"time"

	scorixsqlx "github.com/tradalab/scorix/module/sqlx"
	"github.com/tradalab/scorix/module/sqlx/order"
)

var _ ConnectionModel = (*customConnectionModel)(nil)

const connectionUngroupSQL = "UPDATE `connection` SET `group_id` = '', `sort_order` = `sort_order` + ?, `updated_at` = ? WHERE `group_id` = ? AND `deleted_at` IS NULL"

var connectionOrder = order.Spec{
	Table:         "connection",
	OrderColumn:   "sort_order",
	GroupColumn:   "group_id",
	DeletedColumn: "deleted_at",
	UpdatedColumn: "updated_at",
}

type (
	ConnectionModel interface {
		connectionModel
		NextSortOrder(ctx context.Context, groupID string) (int64, error)
		Reorder(ctx context.Context, groupID string, ids []string) error
		Ungroup(ctx context.Context, groupID string) error
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

func (m *customConnectionModel) NextSortOrder(ctx context.Context, groupID string) (int64, error) {
	return order.Next(ctx, scorixsqlx.From(ctx, m.conn), connectionOrder, groupID)
}

func (m *customConnectionModel) Reorder(ctx context.Context, groupID string, ids []string) error {
	return order.Reorder(ctx, scorixsqlx.From(ctx, m.conn), connectionOrder, groupID, ids, time.Now())
}

func (m *customConnectionModel) Ungroup(ctx context.Context, groupID string) error {
	offset, err := m.NextSortOrder(ctx, "")
	if err != nil {
		return err
	}
	conn := scorixsqlx.From(ctx, m.conn)
	_, err = conn.ExecContext(ctx, conn.Rebind(connectionUngroupSQL), offset, time.Now(), groupID)
	return err
}

func (c *Connection) Addr() string {
	if (c.Mode == "sentinel" || c.Mode == "cluster") && c.Addrs != "" {
		return c.Addrs
	}
	return net.JoinHostPort(c.Host, strconv.Itoa(int(c.Port)))
}
