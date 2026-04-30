import { CommandContext, CommandResponse, MiddlewareNext } from "../types"
import { getCommandMetadata } from "../registry"

const CONFIRM_TIMEOUT = 30_000

interface PendingDangerous {
  name: string
  normalized: string
  expires_at: number
}

const pendingConfirmations = new Map<string, PendingDangerous>()

export const confirmDangerousMiddleware = async (ctx: CommandContext, next: MiddlewareNext): Promise<CommandResponse> => {
  const metadata = getCommandMetadata(ctx.parsed.name)
  const isDangerous = metadata?.isDangerous ?? false
  const now = Date.now()

  const pending = pendingConfirmations.get(ctx.connectionId)

  if (pending && pending.expires_at < now) {
    pendingConfirmations.delete(ctx.connectionId)
  }

  if (isDangerous) {
    const currentPending = pendingConfirmations.get(ctx.connectionId)
    const normalized = ctx.raw.trim().replace(/\s+/g, " ")

    if (!currentPending) {
      pendingConfirmations.set(ctx.connectionId, {
        name: ctx.parsed.name,
        normalized: normalized,
        expires_at: now + CONFIRM_TIMEOUT,
      })

      return {
        id: ctx.id,
        status: "error",
        stderr: `\x1b[33m⚠ Dangerous command detected\x1b[0m\r\nPlease re-type the command to confirm: \x1b[31m${normalized}\x1b[0m`,
        executionTimeMs: 0
      }
    }

    if (currentPending.normalized !== normalized) {
      pendingConfirmations.delete(ctx.connectionId)
      return {
        id: ctx.id,
        status: "error",
        stderr: `\x1b[31mCommand mismatch.\x1b[0m Please re-type the same command to confirm.`,
        executionTimeMs: 0
      }
    }

    pendingConfirmations.delete(ctx.connectionId)
  } else {
    pendingConfirmations.delete(ctx.connectionId)
  }

  return next()
}
