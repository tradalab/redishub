import { describe, it, expect, vi } from "vitest"
import { confirmDangerousMiddleware } from "./dangerous-command"
import { CommandContext, CommandResponse } from "../types"

function ctx(raw: string, name: string, connectionId = "c1"): CommandContext {
  return {
    id: "req-" + Math.random().toString(36).slice(2),
    raw,
    parsed: { name, args: [] },
    connectionId,
    databaseIdx: 0,
  }
}

const ok: CommandResponse = { id: "x", status: "success", executionTimeMs: 1 }
const next = async () => ok

describe("confirmDangerousMiddleware", () => {
  it("passes a safe command straight through", async () => {
    const res = await confirmDangerousMiddleware(ctx("GET foo", "GET"), next)
    expect(res.status).toBe("success")
  })

  it("blocks a dangerous command on first use, then runs it on identical re-type", async () => {
    const conn = "conn-confirm"
    const first = await confirmDangerousMiddleware(ctx("FLUSHALL", "FLUSHALL", conn), next)
    expect(first.status).toBe("error")
    expect(first.stderr).toMatch(/Dangerous command/i)

    const ran = vi.fn(async () => ok)
    const second = await confirmDangerousMiddleware(ctx("FLUSHALL", "FLUSHALL", conn), ran)
    expect(ran).toHaveBeenCalledOnce()
    expect(second.status).toBe("success")
  })

  it("requires the confirmation to match exactly (different command resets)", async () => {
    const conn = "conn-mismatch"
    await confirmDangerousMiddleware(ctx("CONFIG GET maxmemory", "CONFIG", conn), next)
    const mismatch = await confirmDangerousMiddleware(ctx("CONFIG SET maxmemory 0", "CONFIG", conn), next)
    expect(mismatch.status).toBe("error")
    expect(mismatch.stderr).toMatch(/mismatch/i)
  })

  it("normalizes whitespace when comparing the confirmation", async () => {
    const conn = "conn-ws"
    await confirmDangerousMiddleware(ctx("FLUSHDB", "FLUSHDB", conn), next)
    const ran = vi.fn(async () => ok)
    await confirmDangerousMiddleware(ctx("  FLUSHDB   ", "FLUSHDB", conn), ran)
    expect(ran).toHaveBeenCalledOnce()
  })

  it("scopes pending confirmation per connection", async () => {
    await confirmDangerousMiddleware(ctx("FLUSHALL", "FLUSHALL", "connA"), next)
    const ran = vi.fn(async () => ok)
    const res = await confirmDangerousMiddleware(ctx("FLUSHALL", "FLUSHALL", "connB"), ran)
    expect(ran).not.toHaveBeenCalled()
    expect(res.status).toBe("error")
  })

  it("expires a stale confirmation (>30s) and re-prompts", async () => {
    const conn = "conn-expire"
    const now = Date.now()
    const spy = vi.spyOn(Date, "now").mockReturnValue(now)
    await confirmDangerousMiddleware(ctx("FLUSHALL", "FLUSHALL", conn), next)

    spy.mockReturnValue(now + 31_000)
    const ran = vi.fn(async () => ok)
    const res = await confirmDangerousMiddleware(ctx("FLUSHALL", "FLUSHALL", conn), ran)
    expect(ran).not.toHaveBeenCalled()
    expect(res.status).toBe("error")
    spy.mockRestore()
  })
})
