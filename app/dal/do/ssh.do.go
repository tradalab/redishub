package do

import (
	"fmt"
	"net"
	"os"
	"strconv"
	"time"

	"golang.org/x/crypto/ssh"
	"golang.org/x/crypto/ssh/agent"
)

type SshDO struct {
	Base
	Host           string          `json:"host" gorm:"column:host;"`
	Port           int             `json:"port" gorm:"column:port;"`
	Username       string          `json:"username" gorm:"column:username;"`
	Kind           string          `json:"kind" gorm:"column:kind;"`
	Password       string          `json:"password" gorm:"column:password;"`
	PrivateKeyFile string          `json:"private_key_file" gorm:"column:private_key_file;"`
	Passphrase     string          `json:"passphrase" gorm:"column:passphrase;"`
	Connections    []*ConnectionDO `json:"connections,omitempty" gorm:"foreignKey:SshId"`
}

func (d *SshDO) TableName() string {
	return "ssh"
}

func (d *SshDO) BuildAuthMethod() (ssh.AuthMethod, error) {
	switch d.Kind {
	case "password":
		return ssh.Password(d.Password), nil
	case "keypair":
		key, err := os.ReadFile(d.PrivateKeyFile)
		if err != nil {
			return nil, fmt.Errorf("read private key failed: %w", err)
		}

		var signer ssh.Signer

		if d.Passphrase != "" {
			signer, err = ssh.ParsePrivateKeyWithPassphrase(key, []byte(d.Passphrase))
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
		return nil, fmt.Errorf("unsupported ssh kind: %s", d.Kind)
	}
}

func (d *SshDO) BuildClientCfg() (*ssh.ClientConfig, error) {
	authMethod, err := d.BuildAuthMethod()
	if err != nil {
		return nil, err
	}
	return &ssh.ClientConfig{
		User: d.Username,
		Auth: []ssh.AuthMethod{
			authMethod,
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         5 * time.Second,
	}, nil
}

func (d *SshDO) Addr() string {
	return net.JoinHostPort(d.Host, strconv.Itoa(d.Port))
}
