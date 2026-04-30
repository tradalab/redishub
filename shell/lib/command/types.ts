export interface CommandContext {
  id: string
  raw: string
  parsed: {
    name: string
    args: string[]
  }
  connectionId: string
  databaseIdx: number
  signal?: AbortSignal
}

export interface CommandResponse {
  id: string
  status: "success" | "error" | "cancelled"
  stdout?: string
  stderr?: string
  executionTimeMs: number
}

export type MiddlewareNext = () => Promise<CommandResponse>
export type Middleware = (ctx: CommandContext, next: MiddlewareNext) => Promise<CommandResponse>

export type CommandCategory = "String" | "Hash" | "List" | "Set" | "SortedSet" | "Connection" | "Server" | "Generic" | "Client"

export interface CommandMetadata {
  name: string
  syntax: string
  summary: string
  isDangerous: boolean
  category: CommandCategory
  docLink?: string
}
