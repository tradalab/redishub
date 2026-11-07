import type { ClientStateEvent, ConnectionReq } from "@/types"

type Matchable = Pick<ConnectionReq, "name" | "host" | "port" | "addrs" | "sock" | "tags">

export function connectionMatches(c: Partial<Matchable> | undefined, name: string, keyword: string): boolean {
  const k = keyword.trim().toLowerCase()
  if (!k) return true
  const hostPort = c?.host && c?.port ? `${c.host}:${c.port}` : c?.host
  const fields = [name, hostPort, c?.addrs, c?.sock, ...(c?.tags ?? [])]
  return fields.some(f => !!f && f.toLowerCase().includes(k))
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

const EXPANDED_KEY = "redishub:sidebar:expanded"

export function loadExpanded(): Set<string> {
  try {
    const raw = JSON.parse(globalThis.localStorage?.getItem(EXPANDED_KEY) ?? "[]")
    return new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [])
  } catch {
    return new Set()
  }
}

export function saveExpanded(ids: Set<string>) {
  try {
    globalThis.localStorage?.setItem(EXPANDED_KEY, JSON.stringify([...ids]))
  } catch {}
}

export function addTag(tags: string[], tag: string): string[] {
  const t = tag.trim()
  if (!t || tags.some(x => x.toLowerCase() === t.toLowerCase())) return tags
  return [...tags, t]
}
