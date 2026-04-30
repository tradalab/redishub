import scorix from "@/lib/scorix"
import { CommandContext, CommandResponse, Middleware } from "./types"

export class CommandEngine {
  private middlewares: Middleware[] = []
  private static activeConnections = new Set<string>()
  private static pendingRequests = new Map<string, (res: CommandResponse) => void>()

  constructor() { }

  public use(middleware: Middleware) {
    this.middlewares.push(middleware)
    return this
  }

  private ensureListener(connectionId: string) {
    if (CommandEngine.activeConnections.has(connectionId)) return

    CommandEngine.activeConnections.add(connectionId)
    scorix.on("console:output:" + connectionId, (payload: any, error: string) => {
      const id = payload?.id
      if (!id) {
        console.warn("Received output without command ID", payload, error)
        return
      }

      const resolve = CommandEngine.pendingRequests.get(id)
      if (resolve) {
        CommandEngine.pendingRequests.delete(id)
        resolve({
          id,
          status: error || payload?.stderr ? "error" : "success",
          stdout: payload?.stdout,
          stderr: payload?.stderr || error,
          executionTimeMs: 0,
        })
      }
    })
  }

  public async execute(ctx: CommandContext): Promise<CommandResponse> {
    this.ensureListener(ctx.connectionId)

    const startTime = Date.now()
    let mwIndex = -1

    const dispatch = async (i: number): Promise<CommandResponse> => {
      if (i <= mwIndex) throw new Error("next() called multiple times")
      mwIndex = i

      if (i < this.middlewares.length) {
        const mw = this.middlewares[i]
        return mw(ctx, () => dispatch(i + 1))
      }

      return new Promise<CommandResponse>((resolve, reject) => {
        const abortHandler = () => {
          scorix.emit("console:cancel:" + ctx.connectionId, { id: ctx.id }).catch(console.error)
          CommandEngine.pendingRequests.delete(ctx.id)
          resolve({
            id: ctx.id,
            status: "cancelled",
            executionTimeMs: Date.now() - startTime,
          })
        }

        if (ctx.signal) {
          if (ctx.signal.aborted) {
            return resolve({ id: ctx.id, status: "cancelled", executionTimeMs: 0 })
          }
          ctx.signal.addEventListener("abort", abortHandler)
        }

        CommandEngine.pendingRequests.set(ctx.id, (res) => {
          if (ctx.signal) {
            ctx.signal.removeEventListener("abort", abortHandler)
          }
          res.executionTimeMs = Date.now() - startTime
          resolve(res)
        })

        scorix.emit("console:input:" + ctx.connectionId, {
          id: ctx.id,
          command: ctx.raw,
        }).catch((err) => {
          if (ctx.signal) {
            ctx.signal.removeEventListener("abort", abortHandler)
          }
          CommandEngine.pendingRequests.delete(ctx.id)
          resolve({
            id: ctx.id,
            status: "error",
            stderr: err?.message || "Failed to emit command",
            executionTimeMs: Date.now() - startTime,
          })
        })
      })
    }

    return dispatch(0)
  }
}

export const defaultEngine = new CommandEngine()
