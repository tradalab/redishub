package netx

import (
	"strings"
)

func SplitLines(s string) []string {
	var res []string
	lines := strings.Split(s, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" {
			res = append(res, line)
		}
	}
	return res
}

func SplitKV(s string, sep string) []string {
	parts := strings.SplitN(s, sep, 2)
	for i := range parts {
		parts[i] = strings.TrimSpace(parts[i])
	}
	return parts
}
