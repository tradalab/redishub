package client

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/google/shlex"
	"github.com/redis/go-redis/v9"
	"github.com/samber/lo"
	"github.com/tradalab/rdms/app/svc"
)

type ConsoleConnectLogicArgs struct {
	ConnectionId  string `json:"connection_id" validate:"required"`
	DatabaseIndex int    `json:"database_index"`
}

type ConsoleConnectLogic struct {
	ctx       context.Context
	svcCtx    *svc.ServiceContext
	cancelMap map[string]context.CancelFunc
}

type CmdArgs struct {
	Id      string `json:"id"`
	Command string `json:"command"`
}

type CmdResult struct {
	Id     string `json:"id"`
	Stdout string `json:"stdout"`
	Stderr string `json:"stderr"`
}

func NewConsoleConnectLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ConsoleConnectLogic {
	return &ConsoleConnectLogic{ctx: ctx, svcCtx: svcCtx, cancelMap: make(map[string]context.CancelFunc)}
}

func (l *ConsoleConnectLogic) ConsoleConnectLogic(params ConsoleConnectLogicArgs) (any, error) {
	cli, err := l.svcCtx.Cli.Get(params.ConnectionId, params.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	eventIn := "console:input:" + params.ConnectionId
	eventOut := "console:output:" + params.ConnectionId

	l.svcCtx.App.Evt().On("console:cancel:"+params.ConnectionId, func(ctx context.Context, args struct {
		Id string `json:"id"`
	}) {
		if cancel, ok := l.cancelMap[args.Id]; ok {
			cancel()
			delete(l.cancelMap, args.Id)
		}
	})

	l.svcCtx.App.Evt().On(eventIn, func(ctx context.Context, cmdArgs CmdArgs) {
		cmds := SplitCmd(cmdArgs.Command)
		if len(cmds) == 0 || cmds[0] == "" {
			return
		}

		cmdCtx, cancel := context.WithCancel(context.Background())
		l.cancelMap[cmdArgs.Id] = cancel
		defer func() {
			cancel()
			delete(l.cancelMap, cmdArgs.Id)
		}()

		args := lo.ToAnySlice(cmds)
		result, err := cli.Rdb.Do(cmdCtx, args...).Result()
		if err != nil && !errors.Is(err, redis.Nil) {
			l.svcCtx.App.Evt().Emit(context.Background(), "", eventOut, CmdResult{Id: cmdArgs.Id, Stderr: err.Error()})
			return
		}

		// handle select db
		if strings.EqualFold(cmds[0], "select") {
			if db, err := strconv.Atoi(cmds[1]); err == nil {
				_ = db
				// TODO: switch DB | block switch
				return
			}
		}

		l.svcCtx.App.Evt().Emit(context.Background(), "", eventOut, CmdResult{Id: cmdArgs.Id, Stdout: AnyToString(result)})
	})

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
