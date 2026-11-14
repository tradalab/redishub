package svc

import (
	"context"
	"errors"
	"time"

	"github.com/tradalab/scorix/fault"
	"github.com/tradalab/scorix/netx"
)

const (
	CodeHostKeyUnknown = "ssh_host_key_unknown"
	CodeHostKeyChanged = "ssh_host_key_changed"
)

func HostKeyFault(err error) error {
	var hk *netx.HostKeyError
	if !errors.As(err, &hk) {
		return err
	}
	code := CodeHostKeyUnknown
	if hk.Changed {
		code = CodeHostKeyChanged
	}
	return fault.Wrap(code, err).
		With("key", hk.AuthorizedKey()).
		With("fingerprint", hk.Fingerprint())
}

func (c *Client) hostKeyFault(dialTimeout int64) error {
	if c.route == nil {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(dialTimeout)*time.Second)
	defer cancel()
	err := c.route.Check(ctx)
	if fe := HostKeyFault(err); fe != err {
		return fe
	}
	return nil
}
