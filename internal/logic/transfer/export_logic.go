// Scaffolded by scorix; yours to edit, generate never rewrites it.
package transfer

import (
	"bufio"
	"context"
	"encoding/base64"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/tradalab/scorix/app"
	"github.com/tradalab/scorix/module/dialog"

	"github.com/tradalab/rdms/internal/svc"
	"github.com/tradalab/rdms/internal/types"
	"github.com/tradalab/rdms/pkg/keyfilter"
	"github.com/tradalab/rdms/pkg/redisscan"
)

const (
	progressInterval = 250 * time.Millisecond
	maxErrorSamples  = 5
)

type ExportLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewExportLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ExportLogic {
	return &ExportLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

// Desktop: the server opens the save dialog itself, so a client can never name the path it
// writes to. Web: there is no dialog on this host, so the file goes to the browser in chunks.
func (l *ExportLogic) Export(req *types.TransferExportReq, out app.Sink[types.TransferProgressEvent]) error {
	cli, err := l.svcCtx.RedisManager.Get(req.ConnectionId, int(req.DatabaseIndex))
	if err != nil {
		return err
	}
	each, err := selection(req, cli.Rdb)
	if err != nil {
		return err
	}
	format := formatNDJSON
	if req.Format == formatMsgpack {
		format = formatMsgpack
	}
	name := req.FileName
	if name == "" {
		name = "redis"
	}
	name += "." + format

	ctx := out.Context()
	ev := types.TransferProgressEvent{Errors: []string{}}
	if l.svcCtx.Web {
		ev.Path = name
		cw := &chunkWriter{send: func(chunk string) error {
			ev.Chunk = chunk
			defer func() { ev.Chunk = "" }()
			return out.Send(&ev)
		}}
		buf := bufio.NewWriterSize(cw, chunkSize)
		if err := dumpAll(ctx, cli.Rdb, each, format, buf, &ev, func() error { return out.Send(&ev) }); err != nil {
			return err
		}
		if err := buf.Flush(); err != nil {
			return err
		}
		ev.Done = true
		return out.Send(&ev)
	}

	path, err := dialog.New().SaveFile(ctx, dialog.SaveFileRequest{
		Title:    "Export keys",
		Filter:   strings.ToUpper(format),
		Ext:      format,
		FileName: name,
	})
	if err != nil {
		return err
	}
	ev.Path = path
	if path == "" {
		ev.Done = true
		return out.Send(&ev)
	}
	if err := out.Send(&ev); err != nil {
		return err
	}

	// Written beside the target and renamed at the end, so a cancelled export never leaves a
	// truncated file under the name the user chose.
	tmp, err := os.CreateTemp(filepath.Dir(path), ".redishub-export-*")
	if err != nil {
		return err
	}
	committed := false
	defer func() {
		if !committed {
			tmp.Close()
			os.Remove(tmp.Name())
		}
	}()

	buf := bufio.NewWriterSize(tmp, 1<<20)
	if err := dumpAll(ctx, cli.Rdb, each, format, buf, &ev, func() error { return out.Send(&ev) }); err != nil {
		return err
	}
	if err := buf.Flush(); err != nil {
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	if err := os.Rename(tmp.Name(), path); err != nil {
		return err
	}
	committed = true

	ev.Done = true
	return out.Send(&ev)
}

func dumpAll(ctx context.Context, rdb redis.UniversalClient, each keyWalker, format string, w io.Writer, ev *types.TransferProgressEvent, progress func() error) error {
	cw := &countingWriter{w: w}
	d := &dumper{ctx: ctx, rdb: rdb, out: newSink(format, cw)}
	if err := d.out.header(); err != nil {
		return err
	}
	last := time.Now()
	err := each(ctx, func(key string) error {
		switch err := d.dump(key); {
		case errors.Is(err, errKeyGone):
			ev.Skipped++
		case errors.As(err, new(unsupportedError)):
			ev.Skipped++
			if len(ev.Errors) < maxErrorSamples {
				ev.Errors = append(ev.Errors, key+": "+err.Error())
			}
		case err != nil:
			return err
		default:
			ev.Keys++
		}
		ev.Bytes = cw.n
		if time.Since(last) < progressInterval {
			return nil
		}
		last = time.Now()
		return progress()
	})
	ev.Bytes = cw.n
	return err
}

const chunkSize = 512 << 10

type chunkWriter struct{ send func(chunk string) error }

// bufio hands a write larger than its buffer straight through, so one big value is split here.
func (c *chunkWriter) Write(p []byte) (int, error) {
	for off := 0; off < len(p); off += chunkSize {
		if err := c.send(base64.StdEncoding.EncodeToString(p[off:min(len(p), off+chunkSize)])); err != nil {
			return off, err
		}
	}
	return len(p), nil
}

type keyWalker func(ctx context.Context, fn func(key string) error) error

func selection(req *types.TransferExportReq, rdb redis.UniversalClient) (keyWalker, error) {
	if len(req.Keys) > 0 {
		return func(ctx context.Context, fn func(string) error) error {
			for _, k := range req.Keys {
				if err := ctx.Err(); err != nil {
					return err
				}
				if err := fn(k); err != nil {
					return err
				}
			}
			return nil
		}, nil
	}

	clauses := make([]keyfilter.Clause, 0, len(req.Filters))
	for _, f := range req.Filters {
		clauses = append(clauses, keyfilter.Clause{Pattern: f.Pattern, Mode: f.Mode, Exclude: f.Exclude, IgnoreCase: f.IgnoreCase})
	}
	filter, err := keyfilter.Compile(clauses, req.MatchAll)
	if err != nil {
		return nil, err
	}
	match := filter.Pushdown()
	if req.Prefix != "" {
		match = escapeGlob(req.Prefix) + "*"
	}

	return func(ctx context.Context, fn func(string) error) error {
		cur := redisscan.Cursor{}
		for !cur.Done() {
			if err := ctx.Err(); err != nil {
				return err
			}
			keys, next, err := redisscan.Page(ctx, rdb, cur, match, dumpPage, req.KeyType)
			if err != nil {
				return err
			}
			for _, k := range keys {
				if req.Prefix != "" && !strings.HasPrefix(k, req.Prefix) || !filter.Match(k) {
					continue
				}
				if err := fn(k); err != nil {
					return err
				}
			}
			cur = next
		}
		return nil
	}, nil
}

func escapeGlob(s string) string {
	var b strings.Builder
	for _, r := range s {
		if strings.ContainsRune(`*?[]\`, r) {
			b.WriteByte('\\')
		}
		b.WriteRune(r)
	}
	return b.String()
}
