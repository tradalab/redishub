package connection

import "github.com/tradalab/scorix/module/sqlx/order"

func encodeTags(in []string) string {
	v, err := order.Tags(in).Value()
	if err != nil {
		return "[]"
	}
	return v.(string)
}

func decodeTags(s string) []string {
	var t order.Tags
	if t.Scan(s) != nil {
		return []string{}
	}
	return t
}
