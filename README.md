# RedisHub

RedisHub is a powerful, cross-platform command center for the Redis ecosystem. Built for performance and reliability, it provides an intuitive interface for managing complex Redis architectures, from standalone instances to high-availability Sentinels and large-scale Clusters.

## Key Features

- **Multi-Tab Interface**: Navigate multiple connections and tasks simultaneously.
- **Advanced Topology Discovery**: Automatic node discovery for Sentinel and Cluster setups.
- **Dynamic SSH Tunneling**: Reach internal nodes through a single gateway with one-click setup.
- **High Performance**: Optimized for browsing and searching databases with 500k+ keys.
- **Universal Support**: Native binaries for Windows, macOS (Universal), and Linux.

---

## Development Guide

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Go** | 1.26+ | `go version` |
| **Node.js** | 22+ | `node -v` |
| **pnpm** | 10.3+ | `pnpm -v` |
| **Docker** | any recent | needed only for local Redis instances |
| **CGO** | enabled | required for SQLite and webview |

**macOS**
```bash
xcode-select --install
```

**Linux (Ubuntu/Debian)**
```bash
sudo apt-get install -y gcc libwebkit2gtk-4.1-dev libgtk-3-dev pkg-config
```

**Windows** — Install [TDM-GCC](https://jmeubank.github.io/tdm-gcc/) or MSYS2 `mingw-w64-gcc` and ensure `gcc` is in `PATH`.

---

### 1. Clone & install dependencies

```bash
git clone https://github.com/tradalab/redishub.git
cd redishub
make deps
```

---

### 2. Start a local Redis instance

```bash
make redis-up
```

This starts all three topologies via Docker:

| Service | Port |
|---------|------|
| Standalone | `6001` |
| Master (Sentinel) | `8001` |
| Replica (Sentinel) | `8002` |
| Sentinel | `9001` |
| Cluster node 1 | `7001` |
| Cluster node 2 | `7002` |
| Cluster node 3 | `7003` |

For the cluster, run this once after `redis-up`:
```bash
make redis-init-cluster
```

---

### 3. Run in development mode

```bash
make dev
```

This builds the frontend, injects it into `.scorix/dist/`, then runs `go run main.go`. The app window opens automatically.

> For frontend-only changes, use `make shell-dev` (Next.js hot-reload). IPC calls to the Go backend won't work in this mode.

---

### 4. Project layout

```
redishub/
├── main.go                  # Entry point — wires app + systray
├── etc/app.yaml             # App config (name, window, logger, modules)
├── app/
│   ├── handler/             # IPC command registration
│   ├── logic/
│   │   ├── client/          # Connection + key operations
│   │   ├── key/             # Per-type key operations (hash, list, …)
│   │   ├── conn/            # Connection test logic
│   │   └── ssh/             # SSH test logic
│   ├── svc/                 # Service context + Redis client manager
│   └── dal/do/              # GORM models (Connection, SSH, TLS, Group, Setting)
├── pkg/
│   ├── netx/                # SSH tunnel helper
│   └── util/                # Binary key encoding
├── shell/                   # Next.js frontend (pnpm workspace)
│   ├── src/                 # React components, pages, hooks
│   └── dist/                # Build output (git-ignored) → copied to .scorix/dist
├── dev/                     # Docker Compose files for local Redis
├── scripts/
│   ├── dev.sh               # Same as `make dev`
│   └── build.sh             # Production binary builder
└── docker/                  # Dockerfiles for CI/CD builds
```

---

### 5. Adding a new IPC command

IPC commands follow the pattern `domain:action` (e.g. `client:connect`).

**Step 1 — Write the logic** in `app/logic/<domain>/<action>.logic.go`:
```go
type MyLogicArgs struct {
    ConnectionId string `json:"connection_id" validate:"required"`
}

func (l *MyLogic) MyLogic(params MyLogicArgs) (interface{}, error) {
    // ... implementation
    return result, nil
}
```

**Step 2 — Register the handler** in `app/handler/handler.go`:
```go
svcCtx.App.Cmd().Handle("client:my-action", func(ctx context.Context, params client.MyLogicArgs) (interface{}, error) {
    return client.NewMyLogic(ctx, svcCtx).MyLogic(params)
})
```

---

### 6. Commands reference

```bash
make dev                  # Build frontend + run app (main workflow)
make shell-dev            # Next.js hot-reload (frontend only)
make deps                 # Install all dependencies
make shell-install        # Install frontend dependencies only
make shell-build          # Build frontend only
make test                 # Run Go tests
make lint                 # Lint everything (go vet + eslint)
make lint-go              # go vet only
make redis-up             # Start all Docker Redis instances
make redis-down           # Stop all Docker Redis instances
make redis-init-cluster   # Initialize cluster topology (first time only)
make redis-status         # Show container status
make redis-logs           # Tail container logs
make build                # Full production binary for current OS/arch
make clean                # Remove build artifacts
```

---

### 7. Troubleshooting

**`//go:embed .scorix/dist/*` fails at build time**
Run `make dev` instead of `go run main.go` directly — it builds the frontend first.

**CGO / `cannot find package "C"` errors**
On macOS: `xcode-select --install`. On Linux: `apt-get install libwebkit2gtk-4.1-dev`. On Windows: install TDM-GCC.

**App window doesn't open**
Set `window.debug: true` in `etc/app.yaml` to open DevTools. Logs go to stdout by default.

**Redis cluster won't connect**
Run `make redis-init-cluster` after `make redis-up`. The cluster requires one-time initialization.

**Port conflict**
Edit port mappings in `dev/docker-compose-*.yaml` and update connection settings in the app.
