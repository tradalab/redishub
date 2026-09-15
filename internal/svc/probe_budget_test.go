package svc

import (
	"net"
	"sync"
	"testing"
	"time"
)

func TestState_SilentServerCountsAsUnreachable(t *testing.T) {
	s, cfg := newMiniredis(t)
	cfg.DialTimeout, cfg.ExecTimeout = 60, 60
	m, _ := observedManager(t, 50*time.Millisecond)
	m.probeBudget = 300 * time.Millisecond

	if _, err := m.Add(cfg, nil, nil, nil, 0); err != nil {
		t.Fatalf("Add: %v", err)
	}
	waitState(t, m, cfg.ID, StateConnected)

	addr := s.Addr()
	s.Close()
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		t.Fatalf("listen on %s: %v", addr, err)
	}
	var mu sync.Mutex
	var held []net.Conn
	t.Cleanup(func() {
		_ = ln.Close()
		mu.Lock()
		defer mu.Unlock()
		for _, c := range held {
			_ = c.Close()
		}
	})
	go func() {
		for {
			c, err := ln.Accept()
			if err != nil {
				return
			}
			mu.Lock()
			held = append(held, c)
			mu.Unlock()
		}
	}()

	waitState(t, m, cfg.ID, StateUnreachable)
}
