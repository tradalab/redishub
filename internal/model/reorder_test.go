package model

import (
	"context"
	"path/filepath"
	"reflect"
	"testing"

	"github.com/jmoiron/sqlx"
	scorixsqlx "github.com/tradalab/scorix/module/sqlx"
	_ "modernc.org/sqlite"

	"github.com/tradalab/rdms/idl"
)

func reorderDB(t *testing.T) *sqlx.DB {
	t.Helper()
	db := sqlx.MustOpen("sqlite", filepath.Join(t.TempDir(), "test.db"))
	t.Cleanup(func() { db.Close() })
	db.MustExec(idl.SchemaSQL)
	return db
}

func TestReorderMovesConnectionsIntoTheGroupInTheOrderGiven(t *testing.T) {
	db := reorderDB(t)
	db.MustExec("INSERT INTO `connection` (id, name, group_id, sort_order) VALUES ('a','a','',0), ('b','b','',1), ('c','c','g1',0), ('d','d','',2)")
	m := NewConnectionModel(func() scorixsqlx.Conn { return db })

	if err := m.Reorder(context.Background(), "g1", []string{"b", "c", "a"}); err != nil {
		t.Fatal(err)
	}
	var got []string
	if err := db.Select(&got, "SELECT id || ':' || group_id || ':' || sort_order FROM `connection` ORDER BY id"); err != nil {
		t.Fatal(err)
	}
	if want := []string{"a:g1:2", "b:g1:0", "c:g1:1", "d::2"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("rows = %v, want %v", got, want)
	}
}

func TestReorderGroupsLeavesDeletedGroupsAlone(t *testing.T) {
	db := reorderDB(t)
	db.MustExec("INSERT INTO `group` (id, name, sort_order) VALUES ('g1','g1',0), ('g2','g2',1)")
	db.MustExec("INSERT INTO `group` (id, name, sort_order, deleted_at) VALUES ('gx','gx',5, CURRENT_TIMESTAMP)")
	m := NewGroupModel(func() scorixsqlx.Conn { return db })

	if err := m.Reorder(context.Background(), []string{"g2", "gx", "g1"}); err != nil {
		t.Fatal(err)
	}
	var got []string
	if err := db.Select(&got, "SELECT id || ':' || sort_order FROM `group` ORDER BY id"); err != nil {
		t.Fatal(err)
	}
	if want := []string{"g1:2", "g2:0", "gx:5"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("rows = %v, want %v", got, want)
	}
}
