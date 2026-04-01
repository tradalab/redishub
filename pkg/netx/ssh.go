package netx

import (
	"net"
	"time"
)

func NewIgnoreDeadlineConn(conn net.Conn) *IgnoreDeadlineConn {
	return &IgnoreDeadlineConn{Conn: conn}
}

type IgnoreDeadlineConn struct {
	net.Conn
}

func (c *IgnoreDeadlineConn) Read(b []byte) (n int, err error) {
	return c.Conn.Read(b)
}

func (c *IgnoreDeadlineConn) Write(b []byte) (n int, err error) {
	return c.Conn.Write(b)
}

func (c *IgnoreDeadlineConn) SetDeadline(t time.Time) error {
	return nil
}

func (c *IgnoreDeadlineConn) SetReadDeadline(t time.Time) error {
	return nil
}

func (c *IgnoreDeadlineConn) SetWriteDeadline(t time.Time) error {
	return nil
}
