package monitor

import (
	"strings"

	"github.com/tradalab/rdms/internal/svc"
)

var heartbeatSuffix = strings.ToLower(`"PING" "` + svc.HeartbeatToken + `"`)

func isHeartbeat(line string) bool {
	return strings.HasSuffix(strings.ToLower(line), heartbeatSuffix)
}
