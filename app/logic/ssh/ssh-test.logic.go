package ssh

import (
	"context"
	"fmt"
	"net"
	"os"
	"time"

	"github.com/tradalab/rdms/app/dal/do"
	"github.com/tradalab/rdms/app/svc"
	"golang.org/x/crypto/ssh"
	"golang.org/x/crypto/ssh/agent"
)

type SshTestLogicArgs struct {
	do.SshDO
}

type SshTestLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewSshTestLogic(ctx context.Context, svcCtx *svc.ServiceContext) *SshTestLogic {
	return &SshTestLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *SshTestLogic) SshTestLogic(params SshTestLogicArgs) (interface{}, error) {
	authMethod, err := buildAuthMethod(params.SshDO)
	if err != nil {
		return nil, err
	}

	config := &ssh.ClientConfig{
		User: params.Username,
		Auth: []ssh.AuthMethod{
			authMethod,
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         5 * time.Second,
	}

	addr := fmt.Sprintf("%s:%d", params.Host, params.Port)

	conn, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		return nil, fmt.Errorf("ssh connect failed: %w", err)
	}

	defer conn.Close()

	return map[string]any{
		"success": true,
	}, nil
}

func buildAuthMethod(sshDO do.SshDO) (ssh.AuthMethod, error) {
	switch sshDO.Kind {
	case "password":
		return ssh.Password(sshDO.Password), nil
	case "keypair":

		key, err := os.ReadFile(sshDO.PrivateKeyFile)
		if err != nil {
			return nil, fmt.Errorf("read private key failed: %w", err)
		}

		var signer ssh.Signer

		if sshDO.Passphrase != "" {
			signer, err = ssh.ParsePrivateKeyWithPassphrase(key, []byte(sshDO.Passphrase))
		} else {
			signer, err = ssh.ParsePrivateKey(key)
		}

		if err != nil {
			return nil, fmt.Errorf("parse private key failed: %w", err)
		}

		return ssh.PublicKeys(signer), nil

	case "agent":
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
		return nil, fmt.Errorf("unsupported ssh kind: %s", sshDO.Kind)
	}
}
