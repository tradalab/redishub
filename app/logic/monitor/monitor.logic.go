package monitor

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
	"github.com/tradalab/rdms/app/svc"
)

type MonitorLogicArgs struct {
	ConnectionId  string `json:"connection_id" validate:"required"`
	DatabaseIndex int    `json:"database_index"`
}

type MonitorLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewMonitorLogic(ctx context.Context, svcCtx *svc.ServiceContext) *MonitorLogic {
	return &MonitorLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *MonitorLogic) Start(args MonitorLogicArgs) (interface{}, error) {
	c, err := l.svcCtx.Cli.Get(args.ConnectionId, args.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	c.MonitorMu.Lock()
	if c.MonitorActive {
		c.MonitorMu.Unlock()
		return "already monitoring", nil
	}

	ctx, cancel := context.WithCancel(context.Background())
	c.MonitorActive = true
	c.MonitorCancel = cancel
	c.MonitorMu.Unlock()

	// MONITOR is a long-running command that blocks the connection
	// Use a dedicated connection (Conn) to prevent it from being returned to the pool
	ch := make(chan string, 1000)
	var m *redis.MonitorCmd
	var conn *redis.Conn

	// Rollback if anything fails from here
	rollback := func() {
		c.MonitorMu.Lock()
		c.MonitorActive = false
		c.MonitorCancel = nil
		c.MonitorMu.Unlock()
		cancel()
	}

	switch rdb := c.Rdb.(type) {
	case *redis.Client:
		conn = rdb.Conn()
		m = conn.Monitor(ctx, ch)
		m.Start()

		c.MonitorMu.Lock()
		c.Monitor = m
		c.MonitorConn = conn
		c.MonitorMu.Unlock()
	case *redis.ClusterClient:
		rollback()
		return nil, fmt.Errorf("MONITOR is not supported on Cluster mode yet")
	case *redis.Ring:
		rollback()
		return nil, fmt.Errorf("MONITOR is not supported on Ring mode yet")
	default:
		rollback()
		return nil, fmt.Errorf("unsupported redis client type for MONITOR")
	}

	eventOut := fmt.Sprintf("monitor:message:%s", args.ConnectionId)
	statusEvent := fmt.Sprintf("monitor:status:%s", args.ConnectionId)

	// Emit started status
	l.svcCtx.App.Evt().Emit(context.Background(), "", statusEvent, true)

	go func(m *redis.MonitorCmd, conn *redis.Conn, cancel context.CancelFunc) {
		defer func() {
			c.MonitorMu.Lock()
			if c.Monitor == m {
				c.Monitor = nil
				c.MonitorActive = false
			}
			if c.MonitorConn == conn {
				c.MonitorConn = nil
			}
			c.MonitorMu.Unlock()

			m.Stop()
			conn.Close()
			cancel()

			// Emit stopped status
			l.svcCtx.App.Evt().Emit(context.Background(), "", statusEvent, false)
		}()

		for {
			select {
			case <-ctx.Done():
				return
			case msg, ok := <-ch:
				if !ok {
					return
				}
				l.svcCtx.App.Evt().Emit(context.Background(), "", eventOut, msg)
			}
		}
	}(m, c.MonitorConn, cancel)

	return "started", nil
}

func (l *MonitorLogic) Stop(args MonitorLogicArgs) (interface{}, error) {
	c, err := l.svcCtx.Cli.Get(args.ConnectionId, args.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	c.MonitorMu.Lock()
	cancel := c.MonitorCancel
	c.MonitorMu.Unlock()

	if cancel != nil {
		cancel()
	}

	// Emit status immediately
	statusEvent := fmt.Sprintf("monitor:status:%s", args.ConnectionId)
	l.svcCtx.App.Evt().Emit(context.Background(), "", statusEvent, false)

	return "stopped", nil
}

func (l *MonitorLogic) Status(args MonitorLogicArgs) (interface{}, error) {
	c, err := l.svcCtx.Cli.Get(args.ConnectionId, args.DatabaseIndex)
	if err != nil {
		return nil, err
	}

	c.MonitorMu.Lock()
	defer c.MonitorMu.Unlock()

	return c.MonitorActive, nil
}
