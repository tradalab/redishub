// Scaffolded by scorix; yours to edit, generate never rewrites it.
package transfer

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"os"

	"github.com/tradalab/rdms/internal/svc"
	"github.com/tradalab/rdms/internal/types"
)

type UploadLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewUploadLogic(ctx context.Context, svcCtx *svc.ServiceContext) *UploadLogic {
	return &UploadLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

// Caps what remote browsers can make the host store.
const (
	maxUpload  = 1 << 30
	maxUploads = 4
)

// Chunks append to a temp file the server names, so the browser chooses the bytes and never a path.
func (l *UploadLogic) Upload(params *types.TransferUploadReq) (*types.TransferUploadRes, error) {
	data, err := base64.StdEncoding.DecodeString(params.Data)
	if err != nil {
		return nil, err
	}
	token := params.Upload
	if token == "" {
		makeRoomForUpload(maxUploads)
		f, err := os.CreateTemp("", uploadPattern)
		if err != nil {
			return nil, err
		}
		f.Close()
		token = remember(f.Name(), true)
	}
	file, ok := lookup(token)
	if !ok || !file.temp {
		return nil, errors.New("the upload has expired, choose the file again")
	}
	if info, err := os.Stat(file.path); err != nil || info.Size()+int64(len(data)) > maxUpload {
		if f, ok := forget(token); ok {
			f.discard()
		}
		if err != nil {
			return nil, err
		}
		return nil, fmt.Errorf("the file is larger than %d MB", maxUpload>>20)
	}
	f, err := os.OpenFile(file.path, os.O_APPEND|os.O_WRONLY, 0)
	if err != nil {
		return nil, err
	}
	_, err = f.Write(data)
	if cerr := f.Close(); err == nil {
		err = cerr
	}
	if err != nil {
		return nil, err
	}
	return &types.TransferUploadRes{Upload: token}, nil
}
