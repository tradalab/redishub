package console

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/shlex"
	"github.com/samber/lo"
)

func SplitCmd(cmd string) []string {
	args, err := shlex.Split(cmd)
	if err != nil {
		return []string{}
	}
	return args
}

func AnyToString(v any) string {
	if v == nil {
		return "(nil)"
	}

	switch x := v.(type) {
	case string:
		return x
	case []byte:
		return string(x)
	case int, int64, float64, bool:
		return fmt.Sprint(x)
	case []any:
		lines := lo.Map(x, func(a any, i int) string {
			return fmt.Sprintf("%d) %s", i+1, AnyToString(a))
		})
		return strings.Join(lines, "\r\n")
	case map[string]any:
		lines := make([]string, 0, len(x)*2)
		i := 1
		for k, v := range x {
			lines = append(lines,
				fmt.Sprintf("%d) %s", i, k),
				fmt.Sprintf("%d) %s", i+1, AnyToString(v)),
			)
			i += 2
		}
		return strings.Join(lines, "\r\n")
	default:
		b, _ := json.MarshalIndent(x, "", "  ")
		return string(b)
	}
}
