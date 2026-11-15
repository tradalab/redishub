package ssh

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/jmoiron/sqlx"
	"github.com/pressly/goose/v3"
	"github.com/tradalab/scorix/fault"
	scorixsqlx "github.com/tradalab/scorix/module/sqlx"
	_ "modernc.org/sqlite"

	"github.com/tradalab/rdms/idl/migration"
	"github.com/tradalab/rdms/internal/model"
	"github.com/tradalab/rdms/internal/svc"
	"github.com/tradalab/rdms/internal/types"
)

const (
	pinA = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl"
	pinB = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFb8U9iQwOgxL7Ui5ZqF9lWUDBh7lcC/Ra5Hyb3gH2mt"
)

func sshContext(t *testing.T) (*svc.ServiceContext, context.Context) {
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
	return &svc.ServiceContext{SshModel: model.NewSshModel(func() scorixsqlx.Conn { return db })}, context.Background()
}

func upsert(t *testing.T, sc *svc.ServiceContext, ctx context.Context, req types.SshReq) string {
	t.Helper()
	res, err := NewUpsertLogic(ctx, sc).Upsert(&req)
	if err != nil {
		t.Fatal(err)
	}
	return res.Id
}

func hostKeyOf(t *testing.T, sc *svc.ServiceContext, ctx context.Context, id string) string {
	t.Helper()
	s, err := sc.SshModel.FindOne(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	return s.HostKey
}

func TestPointingTheConfigAtAnotherHostDropsTheOldPin(t *testing.T) {
	sc, ctx := sshContext(t)
	req := types.SshReq{Host: "bastion-a", Port: 22, Username: "u", Kind: "password", Password: "p", HostKey: pinA}
	req.Id = upsert(t, sc, ctx, req)

	req.Username = "v"
	upsert(t, sc, ctx, req)
	if got := hostKeyOf(t, sc, ctx, req.Id); got != pinA {
		t.Fatalf("editing the user dropped the pin: %q", got)
	}

	req.Host, req.HostKey = "bastion-b", ""
	upsert(t, sc, ctx, req)
	if got := hostKeyOf(t, sc, ctx, req.Id); got != "" {
		t.Fatalf("a new host kept the old host's pin: %q", got)
	}

	req.Port, req.HostKey = 2222, pinB
	upsert(t, sc, ctx, req)
	if got := hostKeyOf(t, sc, ctx, req.Id); got != pinB {
		t.Fatalf("a pin confirmed for the new address was dropped: %q", got)
	}
}

func TestAnEditThatSendsNoKeyKeepsThePin(t *testing.T) {
	sc, ctx := sshContext(t)
	req := types.SshReq{Host: "bastion-a", Port: 22, Username: "u", Kind: "password", Password: "p", HostKey: pinA}
	req.Id = upsert(t, sc, ctx, req)

	req.Username, req.Timeout, req.HostKey = "v", 30, ""
	upsert(t, sc, ctx, req)
	if got := hostKeyOf(t, sc, ctx, req.Id); got != pinA {
		t.Fatalf("an edit without a key cleared the pin: %q", got)
	}
}

func TestTrustPinsOnlyAWellFormedKeyOnAnExistingConfig(t *testing.T) {
	sc, ctx := sshContext(t)
	id := upsert(t, sc, ctx, types.SshReq{Host: "bastion", Port: 22, Username: "u", Kind: "password", Password: "p"})
	trust := NewTrustLogic(ctx, sc)

	if _, err := trust.Trust(&types.SshTrustReq{Id: id, HostKey: "not a key"}); fault.CodeOf(err) != fault.CodeInvalid {
		t.Fatalf("err = %v, want %s", err, fault.CodeInvalid)
	}
	if _, err := trust.Trust(&types.SshTrustReq{Id: "missing", HostKey: pinA}); fault.CodeOf(err) != fault.CodeNotFound {
		t.Fatalf("err = %v, want %s", err, fault.CodeNotFound)
	}
	if _, err := trust.Trust(&types.SshTrustReq{Id: id, HostKey: " " + pinA + "\n"}); err != nil {
		t.Fatal(err)
	}
	if got := hostKeyOf(t, sc, ctx, id); got != pinA {
		t.Fatalf("pinned %q, want %q", got, pinA)
	}
}
