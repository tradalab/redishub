#!/usr/bin/env bash

set -e

cd shell && pnpm lint && pnpm build && cd ..

go run main.go -ldflags="-H=windowsgui"
