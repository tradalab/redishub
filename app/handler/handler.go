package handler

import (
	"context"

	"github.com/tradalab/rdms/app/logic/client"
	"github.com/tradalab/rdms/app/svc"
)

func RegisterHandlers(svcCtx *svc.ServiceContext) {
	handlers := map[string]any{
		"client:connect": func(ctx context.Context, args client.ConnectLogicArgs) (interface{}, error) {
			return client.NewClientConnectLogic(ctx, svcCtx).ClientConnectLogic(args)
		},
		"client:console-connect": func(ctx context.Context, args client.ConsoleConnectLogicArgs) (interface{}, error) {
			return client.NewConsoleConnectLogic(ctx, svcCtx).ConsoleConnectLogic(args)
		},
		"client:disconnect": func(ctx context.Context, args client.DisconnectLogicArgs) (interface{}, error) {
			return client.NewClientDisconnectLogic(ctx, svcCtx).ClientDisconnectLogic(args)
		},
		"client:general": func(ctx context.Context, args client.GeneralLogicArgs) (interface{}, error) {
			return client.NewClientGeneralLogic(ctx, svcCtx).ClientGeneralLogic(args)
		},
		"client:get-slow-query": func(ctx context.Context, args client.GetSlowQueryLogicArgs) (interface{}, error) {
			return client.NewClientGetSlowQuery(ctx, svcCtx).ClientGetSlowQuery(args)
		},
		"client:load-all-keys": func(ctx context.Context, args client.LoadAllKeysLogicArgs) (interface{}, error) {
			return client.NewClientLoadAllKeysLogic(ctx, svcCtx).ClientLoadAllKeysLogic(args)
		},
		"client:load-key-detail": func(ctx context.Context, args client.LoadKeyDetailLogicArgs) (interface{}, error) {
			return client.NewClientLoadKeyDetailLogic(ctx, svcCtx).ClientLoadKeyDetailLogic(args)
		},
		"client:key-create": func(ctx context.Context, args client.KeyCreateLogicArgs) (interface{}, error) {
			return client.NewClientKeyCreateLogic(ctx, svcCtx).ClientKeyCreateLogic(args)
		},
		"client:key-delete": func(ctx context.Context, args client.KeyDeleteLogicArgs) (interface{}, error) {
			return client.NewClientKeyDeleteLogic(ctx, svcCtx).ClientKeyDeleteLogic(args)
		},
		"client:key-name-update": func(ctx context.Context, args client.KeyNameUpdateLogicArgs) (interface{}, error) {
			return client.NewClientKeyNameUpdateLogic(ctx, svcCtx).ClientKeyNameUpdateLogic(args)
		},
		"client:key-ttl-update": func(ctx context.Context, args client.KeyTtlUpdateLogicArgs) (interface{}, error) {
			return client.NewClientKeyTtlUpdateLogic(ctx, svcCtx).ClientKeyTtlUpdateLogic(args)
		},
		"client:key-value-update": func(ctx context.Context, args client.KeyValueUpdateLogicArgs) (interface{}, error) {
			return client.NewClientKeyValueUpdateLogic(ctx, svcCtx).ClientKeyValueUpdateLogic(args)
		},
	}
	for name, handler := range handlers {
		svcCtx.App.Expose(name, handler)
	}
}
