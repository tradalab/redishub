// Scaffolded by scorix; yours to edit, generate never rewrites it.
package transfer

import (
	"context"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"sort"

	"github.com/redis/go-redis/v9"
	"github.com/tradalab/scorix/module/dialog"

	"github.com/tradalab/rdms/internal/svc"
	"github.com/tradalab/rdms/internal/types"
)

type InspectLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewInspectLogic(ctx context.Context, svcCtx *svc.ServiceContext) *InspectLogic {
	return &InspectLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

// Reads the whole file once, so a bad key or a clash shows up before anything is written.
func (l *InspectLogic) Inspect(params *types.TransferInspectReq) (*types.TransferInspectRes, error) {
	cli, err := l.svcCtx.RedisManager.Get(params.ConnectionId, int(params.DatabaseIndex))
	if err != nil {
		return nil, err
	}
	empty := &types.TransferInspectRes{Types: []types.TransferTypeCount{}, Errors: []string{}}

	var file storedFile
	name := ""
	switch {
	case params.Upload != "":
		f, ok := forget(params.Upload)
		if !ok {
			return nil, errors.New("the upload has expired, choose the file again")
		}
		file = f
	case l.svcCtx.Web:
		return nil, errors.New("web mode imports an uploaded file")
	default:
		path, err := dialog.New().OpenFile(l.ctx, dialog.OpenFileRequest{Title: "Import keys"})
		if err != nil || path == "" {
			return empty, err
		}
		file = storedFile{path: path}
		name = filepath.Base(path)
	}

	res, err := l.inspect(cli.Rdb, file.path)
	if err != nil {
		file.discard()
		return nil, err
	}
	res.FileName = name
	res.Token = remember(file.path, file.temp)
	return res, nil
}

func (l *InspectLogic) inspect(rdb redis.UniversalClient, path string) (*types.TransferInspectRes, error) {
	df, err := openDump(path)
	if err != nil {
		return nil, err
	}
	defer df.Close()

	res := &types.TransferInspectRes{Types: []types.TransferTypeCount{}, Errors: []string{}}
	byType := map[string]int64{}
	var batch []string
	flush := func() error {
		if len(batch) == 0 {
			return nil
		}
		cmds, err := rdb.Pipelined(l.ctx, func(p redis.Pipeliner) error {
			for _, k := range batch {
				p.Exists(l.ctx, k)
			}
			return nil
		})
		if err != nil {
			return err
		}
		for _, c := range cmds {
			res.Conflicts += c.(*redis.IntCmd).Val()
		}
		batch = batch[:0]
		return nil
	}

	for {
		key, rec, err := df.src.next()
		if err == io.EOF {
			break
		}
		if errors.As(err, new(recordError)) {
			res.Invalid++
			if len(res.Errors) < maxErrorSamples {
				res.Errors = append(res.Errors, fmt.Sprintf("%s: %v", df.src.where(), err))
			}
			continue
		}
		if err != nil {
			return nil, err
		}
		res.Keys++
		byType[rec.kind]++
		if batch = append(batch, key); len(batch) >= dumpPage {
			if err := flush(); err != nil {
				return nil, err
			}
		}
	}
	if err := flush(); err != nil {
		return nil, err
	}

	for kind, n := range byType {
		res.Types = append(res.Types, types.TransferTypeCount{Kind: kind, Keys: n})
	}
	sort.Slice(res.Types, func(i, j int) bool { return res.Types[i].Keys > res.Types[j].Keys })
	return res, nil
}
