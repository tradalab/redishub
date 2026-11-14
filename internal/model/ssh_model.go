package model

import (
	"errors"
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"

	scorixsqlx "github.com/tradalab/scorix/module/sqlx"
	"github.com/tradalab/scorix/netx"
)

var _ SshModel = (*customSshModel)(nil)

type (
	SshModel interface {
		sshModel
	}

	customSshModel struct {
		*defaultSshModel
	}
)

func NewSshModel(conn func() scorixsqlx.Conn) SshModel {
	return &customSshModel{
		defaultSshModel: newDefaultSshModel(conn),
	}
}

var ErrSSHAgentNotRunning = errors.New("ssh agent not running: SSH_AUTH_SOCK is not set")

func (s *Ssh) Netx() (*netx.SSH, error) {
	out := &netx.SSH{
		Addr:     s.Addr(),
		Username: s.Username,
		HostKey:  netx.HostKeyPolicy{Pinned: s.HostKey},
	}
	switch strings.ToLower(s.Kind) {
	case "password":
		out.Password = s.Password
	case "keypair":
		out.PrivateKey, out.Passphrase = s.PrivateKey, s.Passphrase
	case "agent":
		if out.Agent = os.Getenv("SSH_AUTH_SOCK"); out.Agent == "" {
			return nil, ErrSSHAgentNotRunning
		}
	default:
		return nil, fmt.Errorf("unsupported ssh kind: %s", s.Kind)
	}
	return out, nil
}

func (s *Ssh) Addr() string {
	return net.JoinHostPort(s.Host, strconv.Itoa(int(s.Port)))
}
