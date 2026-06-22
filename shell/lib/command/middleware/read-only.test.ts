import { describe, it, expect, vi } from "vitest"
import { readOnlyMiddleware } from "./read-only"
import { CommandContext, CommandResponse } from "../types"

function ctx(name: string, readOnly: boolean): CommandContext {
  return {
    id: "req-" + Math.random().toString(36).slice(2),
    raw: name,
    parsed: { name, args: [] },
    connectionId: "c1",
    databaseIdx: 0,
    readOnly,
  }
}

const ok: CommandResponse = { id: "x", status: "success", executionTimeMs: 1 }

describe("readOnlyMiddleware", () => {
  it("passes every command through when not read-only", async () => {
    const ran = vi.fn(async () => ok)
    const res = await readOnlyMiddleware(ctx("SET", false), ran)
    expect(ran).toHaveBeenCalledOnce()
    expect(res.status).toBe("success")
  })

  it("blocks a known write command when read-only", async () => {
    const ran = vi.fn(async () => ok)
    const res = await readOnlyMiddleware(ctx("SET", true), ran)
    expect(ran).not.toHaveBeenCalled()
    expect(res.status).toBe("error")
    expect(res.stderr).toMatch(/read-only/i)
  })

  it("allows read commands when read-only", async () => {
    const ran = vi.fn(async () => ok)
    await readOnlyMiddleware(ctx("GET", true), ran)
    expect(ran).toHaveBeenCalledOnce()
  })

  it("defers container commands (CONFIG) to the backend when read-only", async () => {
    const ran = vi.fn(async () => ok)
    await readOnlyMiddleware(ctx("CONFIG", true), ran)
    expect(ran).toHaveBeenCalledOnce()
  })

  it("defers unknown commands to the backend when read-only", async () => {
    const ran = vi.fn(async () => ok)
    await readOnlyMiddleware(ctx("SOMEUNKNOWNCMD", true), ran)
    expect(ran).toHaveBeenCalledOnce()
  })
})
