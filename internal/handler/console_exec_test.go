package handler_test

import (
	"encoding/json"
	"net"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"testing/fstest"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/gorilla/websocket"

	"github.com/tradalab/scorix/app"
	"github.com/tradalab/scorix/webview"

	"github.com/tradalab/rdms/internal/handler"
	"github.com/tradalab/rdms/internal/model"
	"github.com/tradalab/rdms/internal/svc"
)

func TestConsoleExecOverWS(t *testing.T) {
	s := miniredis.RunT(t)
	if err := s.Set("foo", "bar"); err != nil {
		t.Fatal(err)
	}
	host, portStr, _ := net.SplitHostPort(s.Addr())
	port, _ := strconv.ParseInt(portStr, 10, 64)

	m := svc.NewManager()
	cfg := &model.Connection{
		ID: "conn-1", Mode: "standalone", Network: "tcp",
		Host: host, Port: port, DialTimeout: 5, ExecTimeout: 5, UpdatedAt: time.Now(),
	}
	if _, err := m.Add(cfg, nil, nil, nil, 0); err != nil {
		t.Fatalf("manager Add: %v", err)
	}
	sc := &svc.ServiceContext{RedisManager: m}

	a, err := app.New(app.Options{URL: "scorix://app/index.html"})
	if err != nil {
		t.Fatal(err)
	}
	a.Serve("scorix", fstest.MapFS{"index.html": {Data: []byte("<html></html>")}})
	handler.RegisterHandlers(a, sc)

	ts := httptest.NewServer(a.Handler())
	defer ts.Close()

	c, _, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(ts.URL, "http")+"/ipc", nil)
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	_ = c.SetReadDeadline(time.Now().Add(5 * time.Second))

	open := webview.Message{
		ID: "x1", Kind: webview.KindRPC, Name: "console:exec", State: webview.StateOpen,
		Data: json.RawMessage(`{"connection_id":"conn-1","database_index":0,"id":"x1","command":"GET foo"}`),
	}
	raw, _ := json.Marshal(open)
	if err := c.WriteMessage(websocket.TextMessage, raw); err != nil {
		t.Fatal(err)
	}

	var gotStdout string
	for {
		_, data, err := c.ReadMessage()
		if err != nil {
			t.Fatalf("read: %v", err)
		}
		var msg webview.Message
		_ = json.Unmarshal(data, &msg)
		switch msg.State {
		case webview.StateMsg:
			var out struct {
				Stdout string `json:"stdout"`
				Stderr string `json:"stderr"`
			}
			_ = json.Unmarshal(msg.Data, &out)
			if out.Stderr != "" {
				t.Fatalf("exec stderr: %s", out.Stderr)
			}
			gotStdout = out.Stdout
		case webview.StateError:
			t.Fatalf("stream error frame: %s", msg.Error)
		case webview.StateDone:
			if gotStdout != "bar" {
				t.Fatalf("console GET foo stdout=%q, want bar", gotStdout)
			}
			return
		}
	}
}
