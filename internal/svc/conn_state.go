package svc

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/tradalab/rdms/internal/types"
)

const (
	StateIdle        = "idle"
	StateConnecting  = "connecting"
	StateConnected   = "connected"
	StateUnreachable = "unreachable"
)

func (m *ClientManager) OnState(fn func(*types.ClientStateEvent)) {
	m.stateMu.Lock()
	defer m.stateMu.Unlock()
	m.onState = fn
}

func (m *ClientManager) States() []types.ClientStateEvent {
	m.stateMu.Lock()
	defer m.stateMu.Unlock()
	out := make([]types.ClientStateEvent, 0, len(m.states))
	for _, s := range m.states {
		out = append(out, s)
	}
	return out
}

func (m *ClientManager) publish(cur, next types.ClientStateEvent) {
	if next.State != cur.State {
		next.Since = time.Now().UnixMilli()
	}
	m.states[next.ConnectionId] = next
	if next != cur && m.onState != nil {
		m.onState(&next)
	}
}

func (m *ClientManager) connecting(id string) {
	m.stateMu.Lock()
	defer m.stateMu.Unlock()
	if _, ok := m.states[id]; ok {
		return
	}
	m.publish(types.ClientStateEvent{ConnectionId: id}, types.ClientStateEvent{ConnectionId: id, State: StateConnecting})
}

func (m *ClientManager) report(id string, err error, latency time.Duration) {
	m.stateMu.Lock()
	defer m.stateMu.Unlock()
	cur, ok := m.states[id]
	if !ok {
		// Removed meanwhile: a late heartbeat must not bring it back.
		return
	}
	next := cur
	if err == nil {
		next.State, next.Error, next.RetryAt = StateConnected, "", 0
		if latency >= 0 {
			next.LatencyMs = latency.Milliseconds()
		}
	} else {
		next.State, next.Error = StateUnreachable, err.Error()
	}
	m.publish(cur, next)
}

func (m *ClientManager) retrying(cli *Client, at time.Time) {
	m.stateMu.Lock()
	defer m.stateMu.Unlock()
	if at.IsZero() {
		delete(m.retries, cli)
	} else {
		m.retries[cli] = at
	}
	id := cli.Cfg.ID
	cur, ok := m.states[id]
	if !ok || cur.State != StateUnreachable {
		return
	}
	now := time.Now()
	var soonest time.Time
	for c, t := range m.retries {
		if c.Cfg.ID == id && t.After(now) && (soonest.IsZero() || t.Before(soonest)) {
			soonest = t
		}
	}
	next := cur
	next.RetryAt = 0
	if !soonest.IsZero() {
		next.RetryAt = soonest.UnixMilli()
	}
	m.publish(cur, next)
}

func (m *ClientManager) forget(id string) {
	m.stateMu.Lock()
	defer m.stateMu.Unlock()
	if _, ok := m.states[id]; !ok {
		return
	}
	delete(m.states, id)
	if m.onState != nil {
		m.onState(&types.ClientStateEvent{ConnectionId: id, State: StateIdle, Since: time.Now().UnixMilli()})
	}
}

func (m *ClientManager) openLocked(id string) bool {
	prefix := id + ":"
	for key := range m.clients {
		if strings.HasPrefix(key, prefix) {
			return true
		}
	}
	return false
}

func (m *ClientManager) forgetUnused(id string) {
	m.mu.RLock()
	open := m.openLocked(id)
	m.mu.RUnlock()
	if !open {
		m.forget(id)
	}
}

func (m *ClientManager) Probe(ctx context.Context, id string) error {
	prefix := id + ":"
	var clients []*Client
	m.mu.RLock()
	for key, c := range m.clients {
		if strings.HasPrefix(key, prefix) {
			clients = append(clients, c)
		}
	}
	m.mu.RUnlock()
	if len(clients) == 0 {
		return fmt.Errorf("connection %s has no open client", id)
	}
	for _, c := range clients {
		_ = m.probe(ctx, c)
	}
	return nil
}

func (m *ClientManager) heartbeat(ctx context.Context, cli *Client) {
	defer m.retrying(cli, time.Time{})
	wait := m.beat
	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(wait):
		}
		if err := m.probe(ctx, cli); err != nil {
			if ctx.Err() != nil {
				return
			}
			wait = min(wait*2, 4*m.beat)
			m.retrying(cli, time.Now().Add(wait))
		} else {
			wait = m.beat
			m.retrying(cli, time.Time{})
		}
	}
}

const HeartbeatToken = "redishub:heartbeat"

func (m *ClientManager) probe(ctx context.Context, cli *Client) error {
	budget := time.Duration(cli.Cfg.DialTimeout+cli.Cfg.ExecTimeout) * time.Second
	if budget <= 0 || budget > m.probeBudget {
		budget = m.probeBudget
	}
	start := time.Now()
	done := make(chan error, 1)
	go func() { done <- cli.Rdb.Do(ctx, "PING", HeartbeatToken).Err() }()

	var err error
	select {
	case err = <-done:
	case <-ctx.Done():
		return ctx.Err()
	case <-time.After(budget):
		m.report(cli.Cfg.ID, fmt.Errorf("no reply within %s", budget), -1)
		select {
		case err = <-done:
		case <-ctx.Done():
			return ctx.Err()
		}
	}
	if ctx.Err() != nil {
		return ctx.Err()
	}
	m.report(cli.Cfg.ID, err, time.Since(start))
	return err
}

type stateHook struct {
	m  *ClientManager
	id string
}

func (h stateHook) DialHook(next redis.DialHook) redis.DialHook {
	return func(ctx context.Context, network, addr string) (net.Conn, error) {
		conn, err := next(ctx, network, addr)
		if err != nil && ctx.Err() == nil && !errors.Is(err, net.ErrClosed) {
			h.m.report(h.id, err, -1)
		}
		return conn, err
	}
}

func (h stateHook) ProcessHook(next redis.ProcessHook) redis.ProcessHook {
	return func(ctx context.Context, cmd redis.Cmder) error {
		err := next(ctx, cmd)
		h.observe(err)
		return err
	}
}

func (h stateHook) ProcessPipelineHook(next redis.ProcessPipelineHook) redis.ProcessPipelineHook {
	return func(ctx context.Context, cmds []redis.Cmder) error {
		err := next(ctx, cmds)
		h.observe(err)
		return err
	}
}

// A timeout (a slow KEYS looks the same) or a client this app closed proves nothing either way.
func (h stateHook) observe(err error) {
	var reply redis.Error
	var nerr net.Error
	switch {
	case err == nil, errors.As(err, &reply):
		h.m.report(h.id, nil, -1)
	case errors.Is(err, net.ErrClosed), errors.As(err, &nerr) && nerr.Timeout():
	case errors.As(err, &nerr), errors.Is(err, io.EOF), errors.Is(err, io.ErrUnexpectedEOF):
		h.m.report(h.id, err, -1)
	}
}
