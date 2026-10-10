package svc

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/tradalab/rdms/internal/types"
)

type stateLog struct {
	mu     sync.Mutex
	states []string
}

func (l *stateLog) record(ev *types.ClientStateEvent) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if n := len(l.states); n == 0 || l.states[n-1] != ev.State {
		l.states = append(l.states, ev.State)
	}
}

func (l *stateLog) snapshot() []string {
	l.mu.Lock()
	defer l.mu.Unlock()
	return append([]string(nil), l.states...)
}

func stateOf(m *ClientManager, id string) string {
	for _, s := range m.States() {
		if s.ConnectionId == id {
			return s.State
		}
	}
	return StateIdle
}

func waitState(t *testing.T, m *ClientManager, id, want string) {
	t.Helper()
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		if stateOf(m, id) == want {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("state stayed %q, want %q", stateOf(m, id), want)
}

func observedManager(t *testing.T, beat time.Duration) (*ClientManager, *stateLog) {
	t.Helper()
	m := NewManager()
	m.beat = beat
	log := &stateLog{}
	m.OnState(log.record)
	t.Cleanup(m.CloseAll)
	return m, log
}

func TestState_HeartbeatFollowsServerDownAndUp(t *testing.T) {
	s, cfg := newMiniredis(t)
	cfg.DialTimeout, cfg.ExecTimeout = 1, 1
	m, log := observedManager(t, 50*time.Millisecond)

	if _, err := m.Add(cfg, nil, nil, nil, 0); err != nil {
		t.Fatalf("Add: %v", err)
	}
	waitState(t, m, cfg.ID, StateConnected)

	s.Close()
	waitState(t, m, cfg.ID, StateUnreachable)

	if err := s.Restart(); err != nil {
		t.Fatalf("restart: %v", err)
	}
	waitState(t, m, cfg.ID, StateConnected)

	m.RemoveConnection(cfg.ID)
	time.Sleep(200 * time.Millisecond)
	if got := stateOf(m, cfg.ID); got != StateIdle {
		t.Fatalf("state after removal = %q, want idle", got)
	}

	want := []string{StateConnecting, StateConnected, StateUnreachable, StateConnected, StateIdle}
	if got := log.snapshot(); len(got) != len(want) {
		t.Fatalf("pushed states %v, want %v", got, want)
	} else {
		for i := range want {
			if got[i] != want[i] {
				t.Fatalf("pushed states %v, want %v", got, want)
			}
		}
	}
}

func TestState_CommandSeesOutageBeforeHeartbeat(t *testing.T) {
	s, cfg := newMiniredis(t)
	cfg.DialTimeout, cfg.ExecTimeout = 1, 1
	m, _ := observedManager(t, time.Hour)

	c, err := m.Add(cfg, nil, nil, nil, 0)
	if err != nil {
		t.Fatalf("Add: %v", err)
	}
	s.Close()
	if err := c.Rdb.Get(context.Background(), "k").Err(); err == nil {
		t.Fatal("GET against a closed server succeeded")
	}
	if got := stateOf(m, cfg.ID); got != StateUnreachable {
		t.Fatalf("state right after a failed command = %q, want unreachable", got)
	}

	if err := s.Restart(); err != nil {
		t.Fatalf("restart: %v", err)
	}
	_ = c.Rdb.Get(context.Background(), "k").Err()
	if got := stateOf(m, cfg.ID); got != StateConnected {
		t.Fatalf("state after the server answered again = %q, want connected", got)
	}
}

func TestState_OtherDatabaseKeepsConnectionOpen(t *testing.T) {
	_, cfg := newMiniredis(t)
	m, _ := observedManager(t, time.Hour)

	for _, db := range []int{0, 1} {
		if _, err := m.Add(cfg, nil, nil, nil, db); err != nil {
			t.Fatalf("Add db %d: %v", db, err)
		}
	}
	if err := m.Remove(cfg.ID, 1); err != nil {
		t.Fatalf("Remove db 1: %v", err)
	}
	if got := stateOf(m, cfg.ID); got != StateConnected {
		t.Fatalf("state with db 0 still open = %q, want connected", got)
	}
	if err := m.Remove(cfg.ID, 0); err != nil {
		t.Fatalf("Remove db 0: %v", err)
	}
	if got := stateOf(m, cfg.ID); got != StateIdle {
		t.Fatalf("state with nothing open = %q, want idle", got)
	}
}

func TestState_ProbeReportsNow(t *testing.T) {
	s, cfg := newMiniredis(t)
	cfg.DialTimeout, cfg.ExecTimeout = 1, 1
	m, _ := observedManager(t, time.Hour)

	if _, err := m.Add(cfg, nil, nil, nil, 0); err != nil {
		t.Fatalf("Add: %v", err)
	}
	s.Close()
	if err := m.Probe(context.Background(), cfg.ID); err != nil {
		t.Fatalf("Probe: %v", err)
	}
	if got := stateOf(m, cfg.ID); got != StateUnreachable {
		t.Fatalf("state after probing a closed server = %q, want unreachable", got)
	}
	if err := m.Probe(context.Background(), "nope"); err == nil {
		t.Fatal("probing a connection with nothing open must fail")
	}
}

func TestState_UnreachableCarriesNextRetry(t *testing.T) {
	s, cfg := newMiniredis(t)
	cfg.DialTimeout, cfg.ExecTimeout = 1, 1
	m, _ := observedManager(t, 50*time.Millisecond)

	if _, err := m.Add(cfg, nil, nil, nil, 0); err != nil {
		t.Fatalf("Add: %v", err)
	}
	s.Close()
	waitState(t, m, cfg.ID, StateUnreachable)

	deadline := time.Now().Add(3 * time.Second)
	var ev types.ClientStateEvent
	for time.Now().Before(deadline) {
		for _, e := range m.States() {
			if e.ConnectionId == cfg.ID {
				ev = e
			}
		}
		if ev.RetryAt > 0 {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	if ev.RetryAt == 0 {
		t.Fatal("an unreachable connection never said when the heartbeat tries again")
	}
	if ahead := time.Until(time.UnixMilli(ev.RetryAt)); ahead > 4*m.beat {
		t.Fatalf("next retry %s away, beyond the 4x backoff cap", ahead)
	}

	if err := s.Restart(); err != nil {
		t.Fatalf("restart: %v", err)
	}
	waitState(t, m, cfg.ID, StateConnected)
	for _, e := range m.States() {
		if e.ConnectionId == cfg.ID && e.RetryAt != 0 {
			t.Fatalf("connected but still announcing a retry at %d", e.RetryAt)
		}
	}
}
