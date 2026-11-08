import { matchesKeyword } from "@tradalab/lyra/utils"
import type { ClientStateEvent, ConnectionReq } from "@/types"

type Matchable = Pick<ConnectionReq, "name" | "host" | "port" | "addrs" | "sock" | "tags">

export function connectionMatches(c: Partial<Matchable> | undefined, name: string, keyword: string): boolean {
  const hostPort = c?.host && c?.port ? `${c.host}:${c.port}` : c?.host
  return matchesKeyword([name, hostPort, c?.addrs, c?.sock, ...(c?.tags ?? [])], keyword)
}

export type StateSummary = { connected: number; connecting: number; unreachable: number }

export function summarizeStates(ids: string[], byId: Record<string, ClientStateEvent>): StateSummary {
  const out: StateSummary = { connected: 0, connecting: 0, unreachable: 0 }
  for (const id of ids) {
    const s = byId[id]?.state
    if (s === "connected" || s === "connecting" || s === "unreachable") out[s]++
  }
  return out
}
