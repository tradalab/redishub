import { CommandContext, CommandResponse, MiddlewareNext } from "../types"
import { getCommandMetadata } from "../registry"

const CONTAINER_COMMANDS = new Set(["CONFIG", "SCRIPT", "FUNCTION", "ACL", "CLUSTER"])

export const readOnlyMiddleware = async (ctx: CommandContext, next: MiddlewareNext): Promise<CommandResponse> => {
  if (!ctx.readOnly) return next()

  const name = ctx.parsed.name.toUpperCase()
  if (CONTAINER_COMMANDS.has(name)) return next()

  if (getCommandMetadata(name)?.isWrite) {
    return {
      id: ctx.id,
      status: "error",
      stderr: `\x1b[33m⚠ Read-only mode\x1b[0m\r\nWrite command \x1b[31m${name}\x1b[0m is blocked on this connection.`,
      executionTimeMs: 0,
    }
  }

  return next()
}
