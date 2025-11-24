package client

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/shlex"
	"github.com/samber/lo"
	"github.com/tradalab/rdms/app/svc"
)

type ConsoleConnectLogicArgs struct {
	DatabaseId    string `json:"database_id" validate:"required"`
	DatabaseIndex int    `json:"database_index"`
}

type ConsoleConnectLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewConsoleConnectLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ConsoleConnectLogic {
	return &ConsoleConnectLogic{ctx: ctx, svcCtx: svcCtx}
}

func (l *ConsoleConnectLogic) ConsoleConnectLogic(params ConsoleConnectLogicArgs) (any, error) {
	//cli, err := l.svcCtx.Cli.Get(params.DatabaseId, params.DatabaseIndex)
	//if err != nil {
	//	return nil, err
	//}
	//
	//eventIn := "console:input:" + params.DatabaseId
	//eventOut := "console:output:" + params.DatabaseId

	//l.svcCtx.App.Context().OnPublicEvent(eventIn, func(payload any) {
	//	str, ok := payload.(string)
	//	if !ok {
	//		return
	//	}
	//
	//	cmds := SplitCmd(str)
	//	if len(cmds) == 0 || cmds[0] == "" {
	//		return
	//	}
	//
	//	args := lo.ToAnySlice(cmds)
	//	result, err := cli.Rdb.Do(context.Background(), args...).Result()
	//
	//	if err != nil && !errors.Is(err, redis.Nil) {
	//		l.svcCtx.App.Context().EmitPublicEvent(eventOut, err.Error())
	//		return
	//	}
	//
	//	// handle SELECT db
	//	if strings.EqualFold(cmds[0], "select") {
	//		if db, err := strconv.Atoi(cmds[1]); err == nil {
	//			_ = db
	//			// TODO: switch DB | block switch
	//			return
	//		}
	//	}
	//
	//	// TODO: handler monitor command
	//
	//	l.svcCtx.App.Context().EmitPublicEvent(eventOut, AnyToString(result))
	//})

	return nil, nil
}

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
