// Package migration holds the versioned schema goose applies at startup,
// declared in scorix.yaml as model.migrations.
//
// Adding a column is TWO steps: put it in ../schema.sql for the model
// generator, then add a numbered migration here - schema.sql is not replayed,
// so nothing else reaches a database that already exists.
package migration

import "embed"

// 00001 is frozen: every install is stamped past it, so an edit there never
// runs again.
//
//go:embed *.sql
var FS embed.FS

const Dir = "."
