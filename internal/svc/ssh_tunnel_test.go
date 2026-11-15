package svc

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"errors"
	"fmt"
	"io"
	"net"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/tradalab/rdms/internal/model"
	"github.com/tradalab/scorix/fault"
	"github.com/tradalab/scorix/netx"
	"golang.org/x/crypto/ssh"
)

type bastion struct {
	addr     string
	hostKey  ssh.PublicKey
	server   *ssh.ServerConfig
	mu       sync.Mutex
	sessions []*ssh.ServerConn
	ended    chan struct{}
}

func startBastion(t *testing.T) *bastion {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = ln.Close() })

	b := &bastion{addr: ln.Addr().String(), ended: make(chan struct{}, 16)}
	b.rekey(t)
	go func() {
		for {
			nc, err := ln.Accept()
			if err != nil {
				return
			}
			b.mu.Lock()
			cfg := b.server
			b.mu.Unlock()
			go b.serve(nc, cfg)
		}
	}()
	return b
}

func (b *bastion) rekey(t *testing.T) {
	t.Helper()
	_, key, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	signer, err := ssh.NewSignerFromKey(key)
	if err != nil {
		t.Fatal(err)
	}
	cfg := &ssh.ServerConfig{PasswordCallback: func(c ssh.ConnMetadata, pw []byte) (*ssh.Permissions, error) {
		if c.User() == "u" && string(pw) == "p" {
			return nil, nil
		}
		return nil, errors.New("denied")
	}}
	cfg.AddHostKey(signer)
	b.mu.Lock()
	b.server, b.hostKey = cfg, signer.PublicKey()
	b.mu.Unlock()
}

func (b *bastion) serve(nc net.Conn, cfg *ssh.ServerConfig) {
	sc, chans, reqs, err := ssh.NewServerConn(nc, cfg)
	if err != nil {
		_ = nc.Close()
		return
	}
	b.mu.Lock()
	b.sessions = append(b.sessions, sc)
	b.mu.Unlock()
	go ssh.DiscardRequests(reqs)
	go func() {
		_ = sc.Wait()
		b.ended <- struct{}{}
	}()

	for nch := range chans {
		if nch.ChannelType() != "direct-tcpip" {
			_ = nch.Reject(ssh.UnknownChannelType, "only direct-tcpip")
			continue
		}
		var p struct {
			Host     string
			Port     uint32
			OrigHost string
			OrigPort uint32
		}
		if err := ssh.Unmarshal(nch.ExtraData(), &p); err != nil {
			_ = nch.Reject(ssh.ConnectionFailed, err.Error())
			continue
		}
		target, err := net.Dial("tcp", net.JoinHostPort(p.Host, strconv.Itoa(int(p.Port))))
		if err != nil {
			_ = nch.Reject(ssh.ConnectionFailed, err.Error())
			continue
		}
		ch, creqs, err := nch.Accept()
		if err != nil {
			_ = target.Close()
			continue
		}
		go ssh.DiscardRequests(creqs)
		go func() { _, _ = io.Copy(ch, target); _ = ch.Close() }()
		go func() { _, _ = io.Copy(target, ch); _ = target.Close() }()
	}
}

func (b *bastion) drop() {
	b.mu.Lock()
	defer b.mu.Unlock()
	for _, s := range b.sessions {
		_ = s.Close()
	}
	b.sessions = nil
}

func (b *bastion) waitEnded(t *testing.T, what string) {
	t.Helper()
	select {
	case <-b.ended:
	case <-time.After(3 * time.Second):
		t.Fatalf("%s: the ssh session never ended", what)
	}
}

func (b *bastion) cfg() *model.Ssh {
	host, portStr, _ := net.SplitHostPort(b.addr)
	port, _ := strconv.ParseInt(portStr, 10, 64)
	return &model.Ssh{Host: host, Port: port, Username: "u", Kind: "password", Password: "p", Timeout: 5, HostKey: b.pin()}
}

func (b *bastion) pin() string {
	return strings.TrimSpace(string(ssh.MarshalAuthorizedKey(b.hostKey)))
}

func pingWithin(c *Client, d time.Duration) error {
	done := make(chan error, 1)
	go func() { done <- c.Rdb.Ping(context.Background()).Err() }()
	select {
	case err := <-done:
		return err
	case <-time.After(d):
		return fmt.Errorf("ping still blocked after %s", d)
	}
}

func tunnelled(t *testing.T, dialTimeout int64) (*ClientManager, *model.Connection, *bastion) {
	t.Helper()
	_, cfg := newMiniredis(t)
	cfg.SshEnable = 1
	cfg.DialTimeout = dialTimeout
	m := NewManager()
	t.Cleanup(m.CloseAll)
	return m, cfg, startBastion(t)
}

func TestSSHTunnel_OutlivesDialTimeout(t *testing.T) {
	m, cfg, b := tunnelled(t, 1)
	c, err := m.Add(cfg, b.cfg(), nil, nil, 0)
	if err != nil {
		t.Fatalf("Add: %v", err)
	}
	time.Sleep(2 * time.Second)
	select {
	case <-b.ended:
		t.Fatal("the ssh session ended on its own while idle")
	default:
	}
	if err := pingWithin(c, 3*time.Second); err != nil {
		t.Fatalf("ping two seconds after a one-second dial timeout: %v", err)
	}
}

func TestSSHTunnel_RedialsAfterSessionDrop(t *testing.T) {
	m, cfg, b := tunnelled(t, 5)
	c, err := m.Add(cfg, b.cfg(), nil, nil, 0)
	if err != nil {
		t.Fatalf("Add: %v", err)
	}
	b.drop()
	b.waitEnded(t, "drop")
	if err := pingWithin(c, 5*time.Second); err != nil {
		t.Fatalf("ping after the bastion dropped the session: %v", err)
	}
}

func TestSSHTunnel_RemoveClosesSession(t *testing.T) {
	m, cfg, b := tunnelled(t, 5)
	if _, err := m.Add(cfg, b.cfg(), nil, nil, 0); err != nil {
		t.Fatalf("Add: %v", err)
	}
	if err := m.Remove(cfg.ID, 0); err != nil {
		t.Fatalf("Remove: %v", err)
	}
	b.waitEnded(t, "Remove")
}

func TestSSHTunnel_UnpinnedBastionIsRefusedWithTheKeyToTrust(t *testing.T) {
	m, cfg, b := tunnelled(t, 5)
	s := b.cfg()
	s.HostKey = ""
	_, err := m.Add(cfg, s, nil, nil, 0)
	fe, ok := errors.AsType[*fault.Error](err)
	if !ok || fe.Code != netx.CodeHostKeyUnknown {
		t.Fatalf("err = %v, want fault %s", err, netx.CodeHostKeyUnknown)
	}
	if fe.Details["key"] != b.pin() || !strings.HasPrefix(fmt.Sprint(fe.Details["fingerprint"]), "SHA256:") {
		t.Fatalf("details = %v, want the bastion's key and fingerprint", fe.Details)
	}
	if err := m.Test(cfg, s, nil, nil, 0); fault.CodeOf(err) != netx.CodeHostKeyUnknown {
		t.Fatalf("Test err = %v, want fault %s", err, netx.CodeHostKeyUnknown)
	}
}

func TestSSHTunnel_ABastionWithAnotherKeySaysChanged(t *testing.T) {
	m, cfg, b := tunnelled(t, 5)
	s := b.cfg()
	s.HostKey = startBastion(t).pin()
	if _, err := m.Add(cfg, s, nil, nil, 0); fault.CodeOf(err) != netx.CodeHostKeyChanged {
		t.Fatalf("err = %v, want fault %s", err, netx.CodeHostKeyChanged)
	}
}

func TestSSHTunnel_ReopeningAnOpenClientWhoseBastionChangedKeySaysChanged(t *testing.T) {
	m, cfg, b := tunnelled(t, 5)
	s := b.cfg()
	c, err := m.Add(cfg, s, nil, nil, 0)
	if err != nil {
		t.Fatalf("Add: %v", err)
	}
	b.rekey(t)
	b.drop()
	b.waitEnded(t, "drop")
	if err := pingWithin(c, 5*time.Second); err == nil {
		t.Fatal("ping through a bastion with another key succeeded")
	}
	if _, err := m.Add(cfg, s, nil, nil, 0); fault.CodeOf(err) != netx.CodeHostKeyChanged {
		t.Fatalf("err = %v, want fault %s", err, netx.CodeHostKeyChanged)
	}
}
