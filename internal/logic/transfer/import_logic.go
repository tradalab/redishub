// Scaffolded by scorix; yours to edit, generate never rewrites it.
package transfer

import (
	"context"
	"errors"
	"fmt"
	"io"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/tradalab/scorix/app"

	"github.com/tradalab/rdms/internal/svc"
	"github.com/tradalab/rdms/internal/types"
)

type ImportLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewImportLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ImportLogic {
	return &ImportLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ImportLogic) Import(req *types.TransferImportReq, out app.Sink[types.TransferProgressEvent]) error {
	cli, err := l.svcCtx.RedisManager.Get(req.ConnectionId, int(req.DatabaseIndex))
	if err != nil {
		return err
	}
	if cli.ReadOnly.Load() {
		return svc.ErrReadOnly
	}
	file, ok := forget(req.Token)
	if !ok {
		return errors.New("the picked file has expired, choose it again")
	}
	defer file.discard()
	df, err := openDump(file.path)
	if err != nil {
		return err
	}
	defer df.Close()

	ctx := out.Context()
	ev := types.TransferProgressEvent{Path: file.path, Errors: []string{}}
	if file.temp {
		ev.Path = "upload"
	}
	skip := func(msg string) {
		ev.Skipped++
		if msg != "" && len(ev.Errors) < maxErrorSamples {
			ev.Errors = append(ev.Errors, msg)
		}
	}
	last := time.Now()
	for {
		if err := ctx.Err(); err != nil {
			return err
		}
		key, rec, err := df.src.next()
		if err == io.EOF {
			break
		}
		switch {
		case errors.As(err, new(recordError)):
			skip(fmt.Sprintf("%s: %v", df.src.where(), err))
		case err != nil:
			return err
		default:
			err := loadKey(ctx, cli.Rdb, key, rec, req.Overwrite, req.KeepTtl)
			var rerr redis.Error
			switch {
			case err == nil:
				ev.Keys++
			case errors.Is(err, errKeyExists):
				skip("")
			// A reply error is about this key (a missing module, a bad stream ID); anything else
			// is the connection, and every later key would fail the same way.
			case errors.As(err, &rerr):
				skip(key + ": " + err.Error())
			default:
				return err
			}
		}
		ev.Bytes = df.read.n
		if time.Since(last) >= progressInterval {
			last = time.Now()
			if err := out.Send(&ev); err != nil {
				return err
			}
		}
	}
	ev.Bytes = df.read.n
	ev.Done = true
	return out.Send(&ev)
}
