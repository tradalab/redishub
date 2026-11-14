// Code scaffolded by scorix. Safe to edit.

package ssh

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/tradalab/rdms/internal/svc"
	"github.com/tradalab/rdms/internal/types"
	"github.com/tradalab/scorix/fault"
	"golang.org/x/crypto/ssh"
)

type TrustLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewTrustLogic(ctx context.Context, svcCtx *svc.ServiceContext) *TrustLogic {
	return &TrustLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *TrustLogic) Trust(params *types.SshTrustReq) (*types.Empty, error) {
	key := strings.TrimSpace(params.HostKey)
	if _, _, _, _, err := ssh.ParseAuthorizedKey([]byte(key)); err != nil {
		return nil, fault.Errorf(fault.CodeInvalid, "host key is not an authorized_keys line: %v", err)
	}
	s, err := l.svcCtx.SshModel.FindOne(l.ctx, params.Id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fault.Errorf(fault.CodeNotFound, "ssh config %s not found", params.Id)
	}
	if err != nil {
		return nil, fmt.Errorf("ssh config %s: %w", params.Id, err)
	}
	s.HostKey = key
	if err := l.svcCtx.SshModel.Update(l.ctx, s); err != nil {
		return nil, err
	}
	return new(types.Empty), nil
}
