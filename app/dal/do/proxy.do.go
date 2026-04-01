package do

import (
	"fmt"
	"net"
	"net/url"
	"strconv"

	"golang.org/x/net/proxy"
)

type ProxyDO struct {
	Base
	Protocol string `json:"protocol" gorm:"column:protocol;default:'http';"` // http, socks5
	Host     string `json:"host" gorm:"column:host;"`
	Port     int    `json:"port" gorm:"column:port;"`
	Username string `json:"username" gorm:"column:username;"`
	Password string `json:"password" gorm:"column:password;"`
}

func (d *ProxyDO) TableName() string {
	return "proxy"
}

func (d *ProxyDO) Addr() string {
	return net.JoinHostPort(d.Host, strconv.Itoa(d.Port))
}

func (d *ProxyDO) BuildDialer(forward proxy.Dialer) (proxy.Dialer, error) {
	switch d.Protocol {
	case "http":
		// HTTP proxy dialer will be handled specifically in client-manager since
		// it often requires CONNECT method which is separate from socks5 dialer.
		return nil, nil 
	case "socks5":
		var auth *proxy.Auth
		if d.Username != "" {
			auth = &proxy.Auth{
				User:     d.Username,
				Password: d.Password,
			}
		}
		return proxy.SOCKS5("tcp", d.Addr(), auth, forward)
	default:
		return nil, fmt.Errorf("unsupported proxy protocol: %s", d.Protocol)
	}
}

func (d *ProxyDO) URL() *url.URL {
	u := &url.URL{
		Scheme: d.Protocol,
		Host:   d.Addr(),
	}
	if d.Username != "" {
		u.User = url.UserPassword(d.Username, d.Password)
	}
	return u
}
