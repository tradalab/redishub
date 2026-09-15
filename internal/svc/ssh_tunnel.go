package svc

import (
	"context"
	"errors"
	"net"
	"sync"

	"github.com/tradalab/rdms/pkg/netx"
	"golang.org/x/crypto/ssh"
)

type sshTunnel struct {
	open func(ctx context.Context) (*ssh.Client, error)

	mu     sync.Mutex
	client *ssh.Client
	closed bool
}

func newSSHTunnel(ctx context.Context, open func(context.Context) (*ssh.Client, error)) (*sshTunnel, error) {
	c, err := open(ctx)
	if err != nil {
		return nil, err
	}
	return &sshTunnel{open: open, client: c}, nil
}

func (t *sshTunnel) session(ctx context.Context) (*ssh.Client, error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.closed {
		return nil, net.ErrClosed
	}
	if t.client == nil {
		c, err := t.open(ctx)
		if err != nil {
			return nil, err
		}
		t.client = c
	}
	return t.client, nil
}

func (t *sshTunnel) discard(c *ssh.Client) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.client == c {
		_ = c.Close()
		t.client = nil
	}
}

func (t *sshTunnel) Dial(ctx context.Context, network, addr string) (net.Conn, error) {
	c, err := t.session(ctx)
	if err != nil {
		return nil, err
	}
	conn, err := dialThrough(ctx, c, network, addr)
	var refused *ssh.OpenChannelError
	if err == nil || errors.As(err, &refused) || ctx.Err() != nil {
		return conn, err
	}
	t.discard(c)
	if c, err = t.session(ctx); err != nil {
		return nil, err
	}
	return dialThrough(ctx, c, network, addr)
}

func (t *sshTunnel) Close() error {
	if t == nil {
		return nil
	}
	t.mu.Lock()
	defer t.mu.Unlock()
	t.closed = true
	if t.client == nil {
		return nil
	}
	err := t.client.Close()
	t.client = nil
	return err
}

func dialThrough(ctx context.Context, c *ssh.Client, network, addr string) (net.Conn, error) {
	type dialResult struct {
		conn net.Conn
		err  error
	}
	ch := make(chan dialResult, 1)
	go func() {
		conn, err := c.Dial(network, addr)
		ch <- dialResult{conn, err}
	}()

	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	case res := <-ch:
		if res.err != nil {
			return nil, res.err
		}
		return &netx.IgnoreDeadlineConn{Conn: res.conn}, nil
	}
}
