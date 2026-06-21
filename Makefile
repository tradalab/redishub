.PHONY: help dev shell-dev generate build package deps shell-install doctor \
        test lint lint-go \
        redis-up redis-down redis-status redis-logs redis-init-cluster \
        clean

SHELL := bash

SHELL_DIR   := shell
SCORIX_DIST := .scorix/dist

# Default target
help:
	@echo ""
	@echo "  RedisHub"
	@echo ""
	@echo "  Development"
	@echo "    make dev               Run the app with Next.js dev server + HMR (scorix dev)"
	@echo ""
	@echo "  Codegen"
	@echo "    make generate          Regenerate proto + model code (scorix generate)"
	@echo ""
	@echo "  Build"
	@echo "    make build             Single-binary build for the host (scorix build)"
	@echo "    make package           Native installer per scorix.yaml targets (scorix package)"
	@echo ""
	@echo "  Setup"
	@echo "    make deps              Install all dependencies (Go + pnpm)"
	@echo "    make shell-install     Install frontend dependencies only"
	@echo "    make doctor            Check environment & dependencies (scorix doctor)"
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

# Development

dev:
	SCORIX_LOGGER_LEVEL=$${SCORIX_LOGGER_LEVEL:-debug} SCORIX_IPC_TRACE=$${SCORIX_IPC_TRACE:-1} scorix dev

# Codegen

## Regenerate handlers/types/events from proto and sqlx models from schema.sql
generate:
	scorix generate proto
	scorix generate model

# Build

## Build the single production binary for the current platform
build:
	scorix build

## Build + wrap into a native installer (msi/dmg/appimage) per scorix.yaml
package:
	scorix package

# Setup

## Install all dependencies
deps: shell-install
	go mod download

## Install frontend dependencies
shell-install:
	cd $(SHELL_DIR) && pnpm install

## Check the toolchain (go, node/pnpm, WebView2 runtime, …)
doctor:
	scorix doctor

# Quality

test: _ensure-embed
	go test ./...

lint: lint-go
	cd $(SHELL_DIR) && pnpm lint

lint-go: _ensure-embed
	go vet ./...

## Internal: `//go:embed all:.scorix/dist` fails to compile when the dir is
## missing, so build the frontend once before go test/vet. (monaco assets are
## copied by the shell's own pnpm build.)
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
	rm -rf $(SCORIX_DIST) $(SHELL_DIR)/dist artifacts .scorix/AppDir app_windows.syso
