package model

import (
	"bytes"
	"context"
	"testing"

	scorixsqlx "github.com/tradalab/scorix/module/sqlx"
	scorixsecrets "github.com/tradalab/scorix/secrets"
)

func useTestCodec(t *testing.T) *scorixsecrets.Store {
	t.Helper()
	store, err := scorixsecrets.NewWithKey(make([]byte, 32))
	if err != nil {
		t.Fatal(err)
	}
	SetSecretCodec(store)
	t.Cleanup(func() { SetSecretCodec(nil) })
	return store
}

func TestSealingASealedConnectionLeavesItAsIs(t *testing.T) {
	useTestCodec(t)

	once, err := sealConnection(&Connection{Password: "hunter2"})
	if err != nil {
		t.Fatal(err)
	}
	if !scorixsecrets.IsEncrypted(once.Password) {
		t.Fatalf("password not sealed: %q", once.Password)
	}
	twice, err := sealConnection(once)
	if err != nil {
		t.Fatal(err)
	}
	if twice.Password != once.Password {
		t.Fatalf("sealed again: %q != %q", twice.Password, once.Password)
	}
}

func TestOpeningPeelsADoubleSeal(t *testing.T) {
	store := useTestCodec(t)

	once, err := store.EncryptString("hunter2")
	if err != nil {
		t.Fatal(err)
	}
	double, err := store.EncryptString(once)
	if err != nil {
		t.Fatal(err)
	}
	c := &Connection{Password: double}
	if err := openConnection(c); err != nil {
		t.Fatal(err)
	}
	if c.Password != "hunter2" {
		t.Fatalf("password = %q, want hunter2", c.Password)
	}
}

func TestAFieldThatDoesNotOpenIsBlankedWithoutFailingTheRow(t *testing.T) {
	store := useTestCodec(t)

	good, err := store.EncryptString("hunter2")
	if err != nil {
		t.Fatal(err)
	}
	c := &Connection{Password: "scorix:v1:not-a-real-token", SentinelPassword: good}
	if err := openConnection(c); err != nil {
		t.Fatalf("a bad field failed the row: %v", err)
	}
	if c.Password != "" {
		t.Fatalf("ciphertext reached the caller as a password: %q", c.Password)
	}
	if c.SentinelPassword != "hunter2" {
		t.Fatalf("sentinel password = %q, want hunter2", c.SentinelPassword)
	}
}

func TestUpdatingARowKeepsASecretThatDoesNotOpenHere(t *testing.T) {
	other, err := scorixsecrets.NewWithKey(bytes.Repeat([]byte{7}, 32))
	if err != nil {
		t.Fatal(err)
	}
	foreign, err := other.EncryptString("hunter2")
	if err != nil {
		t.Fatal(err)
	}
	useTestCodec(t)
	db := reorderDB(t)
	db.MustExec("INSERT INTO `connection` (id, name, password, sentinel_password) VALUES ('c1', 'old', ?, 'plain')", foreign)
	m := NewConnectionModel(func() scorixsqlx.Conn { return db })
	ctx := context.Background()

	c, err := m.FindOne(ctx, "c1")
	if err != nil {
		t.Fatal(err)
	}
	if c.Password != "" {
		t.Fatalf("unreadable password reached the caller: %q", c.Password)
	}
	c.Name = "new"
	c.SentinelPassword = ""
	if err := m.Update(ctx, c); err != nil {
		t.Fatal(err)
	}
	var got struct {
		Password         string `db:"password"`
		SentinelPassword string `db:"sentinel_password"`
	}
	if err := db.Get(&got, "SELECT password, sentinel_password FROM `connection` WHERE id = 'c1'"); err != nil {
		t.Fatal(err)
	}
	if got.Password != foreign {
		t.Fatalf("stored password = %q, want the original sealed value", got.Password)
	}
	if got.SentinelPassword != "" {
		t.Fatalf("a readable secret cleared on purpose came back: %q", got.SentinelPassword)
	}
}
