package ssh

import (
	"context"
	"fmt"

	"github.com/tradalab/rdms/app/dal/do"
	"github.com/tradalab/rdms/app/svc"
	"golang.org/x/crypto/ssh"
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
	config, err := params.SshDO.BuildClientCfg()
	if err != nil {
		return nil, err
	}

	addr := params.SshDO.Addr()

	conn, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		return nil, fmt.Errorf("ssh connect failed: %w", err)
	}

	defer conn.Close()

	return map[string]any{
		"success": true,
	}, nil
}
