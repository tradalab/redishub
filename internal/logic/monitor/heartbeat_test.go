package monitor

import "testing"

func TestIsHeartbeat(t *testing.T) {
	cases := []struct {
		line string
		want bool
	}{
		{`1789463267.681690 [0 127.0.0.1:40716] "PING" "redishub:heartbeat"`, true},
		{`1789463267.681690 [3 10.0.0.9:40716] "ping" "redishub:heartbeat"`, true},
		{`1789463267.685238 [0 127.0.0.1:40730] "PING"`, false},
		{`1789463267.685238 [0 127.0.0.1:40730] "PING" "hello"`, false},
		{`1789463267.685238 [0 127.0.0.1:40730] "SET" "k" "redishub:heartbeat"`, false},
	}
	for _, c := range cases {
		if got := isHeartbeat(c.line); got != c.want {
			t.Errorf("isHeartbeat(%q) = %v, want %v", c.line, got, c.want)
		}
	}
}
