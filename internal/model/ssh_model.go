package model

import (
	"fmt"
	"net"
	"os"
	"strconv"
	"time"

	"golang.org/x/crypto/ssh"
	"golang.org/x/crypto/ssh/agent"

	scorixsqlx "github.com/tradalab/scorix/module/sqlx"
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

func (s *Ssh) BuildAuthMethod() (ssh.AuthMethod, error) {
	switch s.Kind {
	case "password", "PASSWORD":
		return ssh.Password(s.Password), nil
	case "keypair", "KEYPAIR":
		var signer ssh.Signer
		var err error

		if s.Passphrase != "" {
			signer, err = ssh.ParsePrivateKeyWithPassphrase([]byte(s.PrivateKey), []byte(s.Passphrase))
		} else {
			signer, err = ssh.ParsePrivateKey([]byte(s.PrivateKey))
		}

		if err != nil {
			return nil, fmt.Errorf("parse private key failed: %w", err)
		}

		return ssh.PublicKeys(signer), nil

	case "agent", "AGENT":
		socket := os.Getenv("SSH_AUTH_SOCK")
		if socket == "" {
			return nil, fmt.Errorf("ssh agent not running")
		}

		conn, err := net.Dial("unix", socket)
		if err != nil {
			return nil, fmt.Errorf("connect ssh agent failed: %w", err)
		}

		agentClient := agent.NewClient(conn)

		return ssh.PublicKeysCallback(agentClient.Signers), nil

	default:
		return nil, fmt.Errorf("unsupported ssh kind: %s", s.Kind)
	}
}

func (s *Ssh) BuildClientCfg() (*ssh.ClientConfig, error) {
	authMethod, err := s.BuildAuthMethod()
	if err != nil {
		return nil, err
	}
	return &ssh.ClientConfig{
		User: s.Username,
		Auth: []ssh.AuthMethod{
			authMethod,
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         time.Duration(s.Timeout) * time.Second,
	}, nil
}

func (s *Ssh) Addr() string {
	return net.JoinHostPort(s.Host, strconv.Itoa(int(s.Port)))
}
