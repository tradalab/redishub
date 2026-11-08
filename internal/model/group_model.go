package model

import (
	"context"
	"time"

	scorixsqlx "github.com/tradalab/scorix/module/sqlx"
	"github.com/tradalab/scorix/module/sqlx/order"
)

var _ GroupModel = (*customGroupModel)(nil)

var groupOrder = order.Spec{
	Table:         "group",
	OrderColumn:   "sort_order",
	DeletedColumn: "deleted_at",
	UpdatedColumn: "updated_at",
}

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
	return order.Next(ctx, scorixsqlx.From(ctx, m.conn), groupOrder, "")
}

func (m *customGroupModel) Reorder(ctx context.Context, ids []string) error {
	return order.Reorder(ctx, scorixsqlx.From(ctx, m.conn), groupOrder, "", ids, time.Now())
}
