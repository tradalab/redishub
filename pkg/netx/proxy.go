package netx

import (
	"bufio"
	"context"
	"encoding/base64"
	"fmt"
	"net"
	"net/http"
	"time"
)

type HttpConnectDialer struct {
	ProxyAddr string
	Username  string
	Password  string
	Timeout   time.Duration
}

func (d *HttpConnectDialer) Dial(network, addr string) (net.Conn, error) {
	return d.DialContext(context.Background(), network, addr)
}

func (d *HttpConnectDialer) DialContext(ctx context.Context, network, addr string) (net.Conn, error) {
	dialer := &net.Dialer{
		Timeout: d.Timeout,
	}

	conn, err := dialer.DialContext(ctx, "tcp", d.ProxyAddr)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodConnect, "http://"+addr, nil)
	if err != nil {
		_ = conn.Close()
		return nil, err
	}

	if d.Username != "" {
		auth := d.Username + ":" + d.Password
		req.Header.Set("Proxy-Authorization", "Basic "+base64.StdEncoding.EncodeToString([]byte(auth)))
	}

	if err := req.Write(conn); err != nil {
		_ = conn.Close()
		return nil, err
	}

	resp, err := http.ReadResponse(bufio.NewReader(conn), req)
	if err != nil {
		_ = conn.Close()
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		_ = conn.Close()
		return nil, fmt.Errorf("proxy connection failed: %d %s", resp.StatusCode, resp.Status)
	}

	return conn, nil
}

type ContextDialer interface {
	DialContext(ctx context.Context, network, addr string) (net.Conn, error)
}

func NewContextWrapper(d interface {
	Dial(network, addr string) (net.Conn, error)
}) ContextDialer {
	return &contextWrapper{d}
}

type contextWrapper struct {
	d interface {
		Dial(network, addr string) (net.Conn, error)
	}
}

func (w *contextWrapper) DialContext(ctx context.Context, network, addr string) (net.Conn, error) {
	type result struct {
		conn net.Conn
		err  error
	}
	done := make(chan result, 1)
	go func() {
		conn, err := w.d.Dial(network, addr)
		done <- result{conn, err}
	}()
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	case r := <-done:
		return r.conn, r.err
	}
}
