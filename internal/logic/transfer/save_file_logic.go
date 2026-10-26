// Scaffolded by scorix; yours to edit, generate never rewrites it.
package transfer

import (
	"context"
	"errors"
	"os"
	"strings"

	"github.com/tradalab/scorix/module/dialog"

	"github.com/tradalab/rdms/internal/svc"
	"github.com/tradalab/rdms/internal/types"
)

type SaveFileLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewSaveFileLogic(ctx context.Context, svcCtx *svc.ServiceContext) *SaveFileLogic {
	return &SaveFileLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

// Same rule as Export: the path comes from the dialog on this host, never from the client.
func (l *SaveFileLogic) SaveFile(params *types.TransferSaveFileReq) (*types.TransferSaveFileRes, error) {
	if l.svcCtx.Web {
		return nil, errors.New("saving a file needs the desktop app")
	}
	path, err := dialog.New().SaveFile(l.ctx, dialog.SaveFileRequest{
		Title:    "Save",
		Filter:   strings.ToUpper(params.Ext),
		Ext:      params.Ext,
		FileName: params.FileName,
	})
	if err != nil || path == "" {
		return &types.TransferSaveFileRes{}, err
	}
	if err := os.WriteFile(path, []byte(params.Content), 0o644); err != nil {
		return nil, err
	}
	return &types.TransferSaveFileRes{Path: path}, nil
}
