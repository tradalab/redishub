import { describe, it, expect, vi, beforeEach } from "vitest"

let currentStream: any = null
const execMock = vi.fn()

function makeMockStream() {
  const buffer: any[] = []
  const waiters: ((r: IteratorResult<any>) => void)[] = []
  let done = false
  const stream: any = {
    cancelled: false,
    push(frame: any) {
      if (done) return
      if (waiters.length) waiters.shift()!({ value: frame, done: false })
      else buffer.push(frame)
    },
    finish() {
      done = true
      while (waiters.length) waiters.shift()!({ value: undefined, done: true })
    },
    cancel: vi.fn(() => {
      stream.cancelled = true
      done = true
      while (waiters.length) waiters.shift()!({ value: undefined, done: true })
    }),
    [Symbol.asyncIterator]() {
      return {
        next: (): Promise<IteratorResult<any>> => {
          if (buffer.length) return Promise.resolve({ value: buffer.shift(), done: false })
          if (done) return Promise.resolve({ value: undefined, done: true })
          return new Promise(res => waiters.push(res))
        },
      }
    },
  }
  return stream
}

vi.mock("@/api", () => ({
  console: {
    exec: (...args: any[]) => {
      execMock(...args)
      currentStream = makeMockStream()
      return currentStream
    },
  },
}))

import { CommandEngine } from "./engine"
import { CommandContext } from "./types"

function ctx(raw: string, id = "id-1", connectionId = "c1"): CommandContext {
  return { id, raw, parsed: { name: raw.split(" ")[0], args: [] }, connectionId, databaseIdx: 0 }
}

beforeEach(() => {
  execMock.mockClear()
  currentStream = null
})

describe("CommandEngine", () => {
  it("execs the command and resolves with the streamed stdout", async () => {
    const engine = new CommandEngine()
    const p = engine.execute(ctx("PING", "req-1"))
    await Promise.resolve()

    expect(execMock).toHaveBeenCalledOnce()
    expect(execMock.mock.calls[0][0].command).toBe("PING")

    currentStream.push({ stdout: "PONG" })
    currentStream.finish()
    const res = await p
    expect(res.status).toBe("success")
    expect(res.stdout).toBe("PONG")
    expect(res.executionTimeMs).toBeGreaterThanOrEqual(0)
  })

  it("maps stderr output to an error status", async () => {
    const engine = new CommandEngine()
    const p = engine.execute(ctx("BADCMD", "req-err"))
    await Promise.resolve()

    currentStream.push({ stderr: "ERR unknown command" })
    currentStream.finish()
    const res = await p
    expect(res.status).toBe("error")
    expect(res.stderr).toMatch(/unknown command/)
  })

  it("runs middleware in order and short-circuits without exec", async () => {
    const engine = new CommandEngine()
    const order: string[] = []
    engine.use(async (_c, next) => { order.push("a"); return next() })
    engine.use(async (c) => {
      order.push("b")
      return { id: c.id, status: "error", stderr: "blocked", executionTimeMs: 0 }
    })
    engine.use(async (_c, next) => { order.push("c"); return next() })

    const res = await engine.execute(ctx("FLUSHALL", "req-mw"))
    expect(order).toEqual(["a", "b"])
    expect(res.status).toBe("error")
    expect(execMock).not.toHaveBeenCalled()
  })

  it("cancels via AbortSignal: cancels the stream and resolves cancelled", async () => {
    const engine = new CommandEngine()
    const ac = new AbortController()
    const c = ctx("BLPOP q 0", "req-cancel")
    c.signal = ac.signal
    const p = engine.execute(c)
    await Promise.resolve()

    ac.abort()
    const res = await p
    expect(res.status).toBe("cancelled")
    expect(currentStream.cancel).toHaveBeenCalledOnce()
  })
})
