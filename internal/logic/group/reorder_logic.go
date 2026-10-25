// Scaffolded by scorix; yours to edit, generate never rewrites it.
package group

import (
	"context"

	"github.com/tradalab/rdms/internal/svc"
	"github.com/tradalab/rdms/internal/types"
)

type ReorderLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewReorderLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ReorderLogic {
	return &ReorderLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ReorderLogic) Reorder(params *types.GroupReorderReq) (*types.Empty, error) {
	if err := l.svcCtx.GroupModel.Reorder(l.ctx, params.Ids); err != nil {
		return nil, err
	}
	return new(types.Empty), nil
}
