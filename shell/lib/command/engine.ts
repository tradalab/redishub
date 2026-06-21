import { console as consoleApi } from "@/api"
import { CommandContext, CommandResponse, Middleware } from "./types"

export class CommandEngine {
  private middlewares: Middleware[] = []

  public use(middleware: Middleware) {
    this.middlewares.push(middleware)
    return this
  }

  public async execute(ctx: CommandContext): Promise<CommandResponse> {
    const startTime = Date.now()
    let mwIndex = -1

    const dispatch = async (i: number): Promise<CommandResponse> => {
      if (i <= mwIndex) throw new Error("next() called multiple times")
      mwIndex = i

      if (i < this.middlewares.length) {
        const mw = this.middlewares[i]
        return mw(ctx, () => dispatch(i + 1))
      }

      return this.run(ctx, startTime)
    }

    return dispatch(0)
  }

  private async run(ctx: CommandContext, startTime: number): Promise<CommandResponse> {
    if (ctx.signal?.aborted) {
      return { id: ctx.id, status: "cancelled", executionTimeMs: 0 }
    }

    const log = (...a: unknown[]) => console.log("[console:exec]", ctx.id, ...a)
    log("open", ctx.raw)

    const stream = consoleApi.exec({
      connection_id: ctx.connectionId,
      database_index: ctx.databaseIdx,
      id: ctx.id,
      command: ctx.raw,
    })

    const onAbort = () => stream.cancel()
    ctx.signal?.addEventListener("abort", onAbort)

    let stdout = ""
    let stderr = ""
    let frames = 0
    try {
      for await (const out of stream) {
        frames++
        log("frame", out)
        if (out.stdout) stdout += out.stdout
        if (out.stderr) stderr += out.stderr
      }
      log("done", { frames, stdout, stderr })
    } catch (err) {
      log("error", err)
      stderr = (err as Error)?.message || "Command failed"
    } finally {
      ctx.signal?.removeEventListener("abort", onAbort)
    }

    if (ctx.signal?.aborted) {
      return { id: ctx.id, status: "cancelled", executionTimeMs: Date.now() - startTime }
    }

    if (frames === 0 && !stderr) {
      return {
        id: ctx.id,
        status: "error",
        stderr: "No response from server (console:exec stream closed without output)",
        executionTimeMs: Date.now() - startTime,
      }
    }

    return {
      id: ctx.id,
      status: stderr ? "error" : "success",
      stdout,
      stderr,
      executionTimeMs: Date.now() - startTime,
    }
  }
}

export const defaultEngine = new CommandEngine()
