import type { AnalysisPrefix } from "@/types"

export type Rect = { x: number; y: number; w: number; h: number }
export type Tile<T> = Rect & { item: T }

// Squarified so small prefixes stay readable and clickable.
export function squarify<T>(items: T[], value: (item: T) => number, rect: Rect): Tile<T>[] {
  const sorted = items.filter(i => value(i) > 0).sort((a, b) => value(b) - value(a))
  const total = sorted.reduce((s, i) => s + value(i), 0)
  if (!total || rect.w <= 0 || rect.h <= 0) return []

  const scale = (rect.w * rect.h) / total
  const area = (item: T) => value(item) * scale
  const worst = (sum: number, max: number, min: number, side: number) => Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min))

  const out: Tile<T>[] = []
  let { x, y, w, h } = rect
  let i = 0
  while (i < sorted.length) {
    const side = Math.min(w, h)
    const row = [sorted[i]]
    let sum = area(sorted[i])
    const max = sum
    i++
    while (i < sorted.length) {
      const a = area(sorted[i])
      if (worst(sum + a, max, a, side) > worst(sum, max, area(row[row.length - 1]), side)) break
      row.push(sorted[i])
      sum += a
      i++
    }

    const thick = sum / side
    let offset = 0
    for (const item of row) {
      const len = area(item) / thick
      out.push(w >= h ? { x, y: y + offset, w: thick, h: len, item } : { x: x + offset, y, w: len, h: thick, item })
      offset += len
    }
    if (w >= h) {
      x += thick
      w -= thick
    } else {
      y += thick
      h -= thick
    }
  }
  return out
}

export type PrefixNode = { prefix: string; keys: number; bytes: number; hasChildren: boolean } | { prefix: null; keys: number; bytes: number }

// Root is null, not "": keys starting with the delimiter ("/api/x") have a real "" prefix.
export function prefixChildren(all: AnalysisPrefix[], parent: string | null, delimiter: string, parentKeys: number, parentBytes: number): PrefixNode[] {
  const parentOf = (p: string) => p.slice(0, Math.max(0, p.lastIndexOf(delimiter)))
  const depth = parent === null ? 1 : parent.split(delimiter).length + 1
  const children = all.filter(p => p.depth === depth && (depth === 1 || parentOf(p.prefix) === parent))
  const nodes: PrefixNode[] = children.map(c => ({
    prefix: c.prefix,
    keys: c.keys,
    bytes: c.bytes,
    hasChildren: all.some(p => p.depth === depth + 1 && parentOf(p.prefix) === c.prefix),
  }))
  const restKeys = parentKeys - children.reduce((s, c) => s + c.keys, 0)
  const restBytes = parentBytes - children.reduce((s, c) => s + c.bytes, 0)
  if (restBytes > 0) nodes.push({ prefix: null, keys: Math.max(0, restKeys), bytes: restBytes })
  return nodes
}
