// Scaffolded by scorix; yours to edit, generate never rewrites it.
package connection

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

func (l *ReorderLogic) Reorder(params *types.ConnectionReorderReq) (*types.Empty, error) {
	if params.GroupId != "" {
		if _, err := l.svcCtx.GroupModel.FindOne(l.ctx, params.GroupId); err != nil {
			return nil, err
		}
	}
	if err := l.svcCtx.ConnectionModel.Reorder(l.ctx, params.GroupId, params.Ids); err != nil {
		return nil, err
	}
	return new(types.Empty), nil
}
