package model

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/jmoiron/sqlx"
	scorixsqlx "github.com/tradalab/scorix/module/sqlx"
	_ "modernc.org/sqlite"

	"github.com/tradalab/rdms/idl"
)

func TestUngroupMovesConnectionsAfterTheTopLevelInOrder(t *testing.T) {
	db := sqlx.MustOpen("sqlite", filepath.Join(t.TempDir(), "test.db"))
	t.Cleanup(func() { db.Close() })
	db.MustExec(idl.SchemaSQL)
	db.MustExec("INSERT INTO `connection` (id, name, group_id, sort_order) VALUES ('r','r','',0), ('s','s','',1), ('a','a','g1',0), ('b','b','g1',1), ('o','o','g2',0)")
	db.MustExec("INSERT INTO `connection` (id, name, group_id, sort_order, deleted_at) VALUES ('x','x','g1',2, CURRENT_TIMESTAMP)")
	m := NewConnectionModel(func() scorixsqlx.Conn { return db })

	if err := m.Ungroup(context.Background(), "g1"); err != nil {
		t.Fatal(err)
	}
	type row struct {
		ID        string `db:"id"`
		GroupID   string `db:"group_id"`
		SortOrder int64  `db:"sort_order"`
	}
	var rows []row
	if err := db.Select(&rows, "SELECT id, group_id, sort_order FROM `connection` ORDER BY id"); err != nil {
		t.Fatal(err)
	}
	want := []row{{"a", "", 2}, {"b", "", 3}, {"o", "g2", 0}, {"r", "", 0}, {"s", "", 1}, {"x", "g1", 2}}
	if len(rows) != len(want) {
		t.Fatalf("got %d rows, want %d", len(rows), len(want))
	}
	for i, r := range rows {
		if r != want[i] {
			t.Errorf("row %d = %+v, want %+v", i, r, want[i])
		}
	}
}
