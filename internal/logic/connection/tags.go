package connection

import (
	"encoding/json"
	"strings"
)

func normalizeTags(in []string) []string {
	out := make([]string, 0, len(in))
	seen := make(map[string]bool, len(in))
	for _, t := range in {
		t = strings.TrimSpace(t)
		k := strings.ToLower(t)
		if t == "" || seen[k] {
			continue
		}
		seen[k] = true
		out = append(out, t)
	}
	return out
}

func encodeTags(in []string) string {
	b, _ := json.Marshal(normalizeTags(in))
	return string(b)
}

func decodeTags(s string) []string {
	var out []string
	if json.Unmarshal([]byte(s), &out) != nil {
		return []string{}
	}
	return normalizeTags(out)
}
