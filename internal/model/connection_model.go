package model

import (
	"context"
	"net"
	"strconv"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	scorixsqlx "github.com/tradalab/scorix/module/sqlx"
)

var _ ConnectionModel = (*customConnectionModel)(nil)

const connectionNextSortOrderSQL = "SELECT COALESCE(MAX(`sort_order`), -1) + 1 FROM `connection` WHERE `group_id` = ? AND `deleted_at` IS NULL"

type (
	ConnectionModel interface {
		connectionModel
		NextSortOrder(ctx context.Context, groupID string) (int64, error)
		Reorder(ctx context.Context, groupID string, ids []string) error
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
	var next int64
	err := sqlx.GetContext(ctx, scorixsqlx.From(ctx, m.conn), &next, connectionNextSortOrderSQL, groupID)
	return next, err
}

func (m *customConnectionModel) Reorder(ctx context.Context, groupID string, ids []string) error {
	if len(ids) == 0 {
		return nil
	}
	orderCase, in, args := sortOrderCase(ids)
	query := "UPDATE `connection` SET `group_id` = ?, `sort_order` = " + orderCase + ", `updated_at` = ? WHERE `id` IN (" + in + ") AND `deleted_at` IS NULL"
	args = append([]any{groupID}, args...)
	args = append(args, time.Now())
	args = append(args, idArgs(ids)...)
	conn := scorixsqlx.From(ctx, m.conn)
	_, err := conn.ExecContext(ctx, conn.Rebind(query), args...)
	return err
}

func sortOrderCase(ids []string) (orderCase, in string, args []any) {
	var b strings.Builder
	b.WriteString("CASE `id`")
	for i, id := range ids {
		b.WriteString(" WHEN ? THEN ?")
		args = append(args, id, i)
	}
	b.WriteString(" END")
	return b.String(), strings.TrimSuffix(strings.Repeat("?,", len(ids)), ","), args
}

func idArgs(ids []string) []any {
	out := make([]any, len(ids))
	for i, id := range ids {
		out[i] = id
	}
	return out
}

func (c *Connection) Addr() string {
	if (c.Mode == "sentinel" || c.Mode == "cluster") && c.Addrs != "" {
		return c.Addrs
	}
	return net.JoinHostPort(c.Host, strconv.Itoa(int(c.Port)))
}
