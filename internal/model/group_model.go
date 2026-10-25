package model

import (
	"context"
	"time"

	"github.com/jmoiron/sqlx"
	scorixsqlx "github.com/tradalab/scorix/module/sqlx"
)

var _ GroupModel = (*customGroupModel)(nil)

const groupNextSortOrderSQL = "SELECT COALESCE(MAX(`sort_order`), -1) + 1 FROM `group` WHERE `deleted_at` IS NULL"

type (
	GroupModel interface {
		groupModel
		NextSortOrder(ctx context.Context) (int64, error)
		Reorder(ctx context.Context, ids []string) error
	}

	customGroupModel struct {
		*defaultGroupModel
	}
)

func NewGroupModel(conn func() scorixsqlx.Conn) GroupModel {
	return &customGroupModel{
		defaultGroupModel: newDefaultGroupModel(conn),
	}
}

func (m *customGroupModel) NextSortOrder(ctx context.Context) (int64, error) {
	var next int64
	err := sqlx.GetContext(ctx, scorixsqlx.From(ctx, m.conn), &next, groupNextSortOrderSQL)
	return next, err
}

func (m *customGroupModel) Reorder(ctx context.Context, ids []string) error {
	if len(ids) == 0 {
		return nil
	}
	orderCase, in, args := sortOrderCase(ids)
	query := "UPDATE `group` SET `sort_order` = " + orderCase + ", `updated_at` = ? WHERE `id` IN (" + in + ") AND `deleted_at` IS NULL"
	args = append(args, time.Now())
	args = append(args, idArgs(ids)...)
	conn := scorixsqlx.From(ctx, m.conn)
	_, err := conn.ExecContext(ctx, conn.Rebind(query), args...)
	return err
}
