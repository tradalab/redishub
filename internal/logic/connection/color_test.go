package connection

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/jmoiron/sqlx"
	"github.com/pressly/goose/v3"
	scorixsqlx "github.com/tradalab/scorix/module/sqlx"
	_ "modernc.org/sqlite"

	"github.com/tradalab/rdms/idl/migration"
	grouplogic "github.com/tradalab/rdms/internal/logic/group"
	"github.com/tradalab/rdms/internal/model"
	"github.com/tradalab/rdms/internal/svc"
	"github.com/tradalab/rdms/internal/types"
)

func migratedContext(t *testing.T) *svc.ServiceContext {
	t.Helper()
	db, err := sqlx.Open("sqlite", filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })

	if err := goose.SetDialect("sqlite3"); err != nil {
		t.Fatal(err)
	}
	goose.SetBaseFS(migration.FS)
	goose.SetLogger(goose.NopLogger())
	defer goose.SetBaseFS(nil)
	if err := goose.UpContext(context.Background(), db.DB, migration.Dir); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	conn := func() scorixsqlx.Conn { return db }
	return &svc.ServiceContext{
		ConnectionModel: model.NewConnectionModel(conn),
		GroupModel:      model.NewGroupModel(conn),
		RedisManager:    svc.NewManager(),
	}
}

func TestConnectionColorRoundTrip(t *testing.T) {
	ctx := context.Background()
	sc := migratedContext(t)

	save := func(color string) {
		t.Helper()
		req := &types.ConnectionReq{Id: "c1", Name: "prod", Mode: "standalone", Network: "tcp", Host: "127.0.0.1", Port: 6379, Color: color}
		if _, err := NewUpsertLogic(ctx, sc).Upsert(req); err != nil {
			t.Fatalf("upsert %q: %v", color, err)
		}
	}
	read := func() string {
		t.Helper()
		res, err := NewListLogic(ctx, sc).List(&types.Empty{})
		if err != nil || len(res.Items) != 1 {
			t.Fatalf("list: %v (%d items)", err, len(res.Items))
		}
		return res.Items[0].Color
	}

	save("red")
	if got := read(); got != "red" {
		t.Fatalf("created with red, listed as %q", got)
	}
	save("")
	if got := read(); got != "" {
		t.Fatalf("cleared, listed as %q", got)
	}
}

func TestGroupColorRoundTrip(t *testing.T) {
	ctx := context.Background()
	sc := migratedContext(t)

	save := func(color string) {
		t.Helper()
		if _, err := grouplogic.NewUpsertLogic(ctx, sc).Upsert(&types.GroupUpsertReq{Id: "g1", Name: "prod", Color: color}); err != nil {
			t.Fatalf("upsert %q: %v", color, err)
		}
	}
	read := func() string {
		t.Helper()
		res, err := grouplogic.NewListLogic(ctx, sc).List(&types.Empty{})
		if err != nil || len(res.Items) != 1 {
			t.Fatalf("list: %v (%d items)", err, len(res.Items))
		}
		return res.Items[0].Color
	}

	save("teal")
	if got := read(); got != "teal" {
		t.Fatalf("created with teal, listed as %q", got)
	}
	save("violet")
	if got := read(); got != "violet" {
		t.Fatalf("changed to violet, listed as %q", got)
	}
}
