.PHONY: help dev build deps shell-install shell-build shell-dev \
        test lint lint-go \
        redis-up redis-down redis-status redis-logs redis-init-cluster \
        clean

# ─── Paths ───────────────────────────────────────────────────────────────────
SHELL_DIR   := shell
SCORIX_DIST := .scorix/dist
SHELL_DIST  := $(SHELL_DIR)/dist

# ─── Default target ──────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  RedisHub — available commands"
	@echo ""
	@echo "  Development"
	@echo "    make dev               Build frontend then run the Go app"
	@echo "    make shell-dev         Run Next.js dev server (hot-reload, no Go)"
	@echo ""
	@echo "  Setup"
	@echo "    make deps              Install all dependencies (Go + pnpm)"
	@echo "    make shell-install     Install frontend dependencies only"
	@echo ""
	@echo "  Build"
	@echo "    make build             Full production build (current OS/arch)"
	@echo "    make shell-build       Build frontend only"
	@echo ""
	@echo "  Quality"
	@echo "    make test              Run Go tests"
	@echo "    make lint              Lint frontend + Go"
	@echo "    make lint-go           Run go vet"
	@echo ""
	@echo "  Redis (Docker)"
	@echo "    make redis-up          Start standalone + sentinel + cluster"
	@echo "    make redis-down        Stop all Redis containers"
	@echo "    make redis-status      Show container status"
	@echo "    make redis-logs        Tail container logs"
	@echo "    make redis-init-cluster  Initialize Redis cluster topology"
	@echo ""
	@echo "  Cleanup"
	@echo "    make clean             Remove build artifacts and dist"
	@echo ""

# ─── Development ─────────────────────────────────────────────────────────────

## Full dev cycle: build frontend → inject into Go embed dir → run app
dev: shell-build
	@echo "==> Injecting frontend into .scorix/dist"
	@rm -rf $(SCORIX_DIST)
	@mkdir -p $(SCORIX_DIST)
	@cp -R $(SHELL_DIST)/. $(SCORIX_DIST)/
	@echo "==> Running Go app"
	go run main.go

## Run the Next.js dev server alone (no Go backend — UI only, for frontend work)
shell-dev:
	cd $(SHELL_DIR) && pnpm dev

# ─── Setup ───────────────────────────────────────────────────────────────────

## Install all dependencies
deps: shell-install
	go mod download

## Install frontend dependencies
shell-install:
	cd $(SHELL_DIR) && pnpm install

# ─── Build ───────────────────────────────────────────────────────────────────

## Build the full production binary for the current platform
build: shell-build
	@echo "==> Injecting frontend into .scorix/dist"
	@rm -rf $(SCORIX_DIST)
	@mkdir -p $(SCORIX_DIST)
	@cp -R $(SHELL_DIST)/. $(SCORIX_DIST)/
	bash scripts/build.sh

## Build the frontend only
shell-build:
	cd $(SHELL_DIR) && pnpm build

# ─── Quality ─────────────────────────────────────────────────────────────────

test: _ensure-embed
	go test ./...

lint: lint-go
	cd $(SHELL_DIR) && pnpm lint

lint-go: _ensure-embed
	go vet ./...

## Internal: ensure .scorix/dist exists so go:embed doesn't fail
_ensure-embed:
	@if [ ! -d "$(SCORIX_DIST)" ]; then \
		echo "==> .scorix/dist missing — building frontend first"; \
		cd $(SHELL_DIR) && pnpm build; \
		mkdir -p ../$(SCORIX_DIST); \
		cp -R dist/. ../$(SCORIX_DIST)/; \
	fi

# ─── Redis (Docker) ──────────────────────────────────────────────────────────

redis-up:
	cd dev && bash deploy.sh up

redis-down:
	cd dev && bash deploy.sh down

redis-status:
	cd dev && bash deploy.sh status

redis-logs:
	cd dev && bash deploy.sh logs

redis-init-cluster:
	cd dev && bash deploy.sh init-cluster

# ─── Cleanup ─────────────────────────────────────────────────────────────────

clean:
	rm -rf $(SCORIX_DIST) $(SHELL_DIST) artifacts .scorix/AppDir
