import type { ClientStateEvent, ConnectionReq } from "@/types"
import type { TreeItem } from "@/app/_components/tree"

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

export type DropPosition = "before" | "after" | "inside"

export type DropPlan = { kind: "group"; ids: string[] } | { kind: "connection"; groupId: string; ids: string[] }

export function planDrop(tree: TreeItem[], dragId: string, targetId: string, pos: DropPosition): DropPlan | null {
  if (dragId === targetId) return null
  const groups = tree.filter(i => i.isGroup)
  const isGroup = (id: string) => groups.some(g => g.id === id)
  const siblingIds = (groupId: string) => (groupId ? (groups.find(g => g.id === groupId)?.children ?? []) : tree.filter(i => !i.isGroup)).map(c => c.id)

  if (isGroup(dragId)) {
    if (pos === "inside" || !isGroup(targetId)) return null
    const current = groups.map(g => g.id)
    const ids = moveTo(current, dragId, targetId, pos)
    return sameOrder(ids, current) ? null : { kind: "group", ids }
  }

  const drag = findConnection(tree, dragId)
  if (!drag) return null
  let groupId: string
  let ids: string[]
  if (pos === "inside") {
    if (targetId && !isGroup(targetId)) return null
    groupId = targetId
    ids = [...siblingIds(groupId).filter(id => id !== dragId), dragId]
  } else {
    const target = findConnection(tree, targetId)
    if (!target) return null
    groupId = target.connection?.group_id ?? ""
    ids = moveTo(siblingIds(groupId), dragId, targetId, pos)
  }
  const fromGroup = drag.connection?.group_id ?? ""
  if (groupId === fromGroup && sameOrder(ids, siblingIds(groupId))) return null
  return { kind: "connection", groupId, ids }
}

function findConnection(tree: TreeItem[], id: string): TreeItem | undefined {
  for (const item of tree) {
    if (!item.isGroup && item.id === id) return item
    const child = item.children?.find(c => c.id === id)
    if (child) return child
  }
}

function moveTo(ids: string[], dragId: string, targetId: string, pos: "before" | "after"): string[] {
  const rest = ids.filter(id => id !== dragId)
  const at = rest.indexOf(targetId) + (pos === "after" ? 1 : 0)
  return [...rest.slice(0, at), dragId, ...rest.slice(at)]
}

function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i])
}
