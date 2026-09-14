"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { MaximizeIcon, MinusIcon, PlusIcon } from "lucide-react"
import { Badge, Button } from "@tradalab/lyra/ui"
import { useTranslation } from "react-i18next"
import type { GraphEdge, GraphNode } from "@/types"
import { cn } from "@/lib/utils"

// The simulation runs in a fixed virtual box and the SVG scales it through a
// viewBox, so resizing the panel never re-runs the layout.
const BOX_W = 1000
const BOX_H = 700
const NODE_R = 20

// Above this the picture stops being a picture: labels collide, the layout
// takes long enough to be felt, and the table is the better view anyway.
export const MAX_NODES = 300

// Tailwind 500-level hues, dark enough for white text and bright enough to read
// on a dark surface. Indexed by label so a type keeps its colour across queries.
const PALETTE = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6", "#f43f5e"]

type Point = { x: number; y: number }

export type GraphCanvasProps = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  className?: string
}

export function GraphCanvas({ nodes, edges, className }: GraphCanvasProps) {
  const { t } = useTranslation()
  const svgRef = useRef<SVGSVGElement>(null)

  const [view, setView] = useState({ x: 0, y: 0, k: 1 })
  const [hovered, setHovered] = useState<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const dragRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null)

  const shown = useMemo(() => nodes.slice(0, MAX_NODES), [nodes])
  const shownIds = useMemo(() => new Set(shown.map(n => n.id)), [shown])
  const shownEdges = useMemo(() => edges.filter(e => shownIds.has(e.src) && shownIds.has(e.dst)), [edges, shownIds])

  const positions = useMemo(() => layout(shown, shownEdges), [shown, shownEdges])
  const colorOf = useMemo(() => labelColors(shown), [shown])

  const focus = selected ?? hovered
  const neighbours = useMemo(() => {
    if (focus === null) return null
    const set = new Set<number>([focus])
    for (const e of shownEdges) {
      if (e.src === focus) set.add(e.dst)
      if (e.dst === focus) set.add(e.src)
    }
    return set
  }, [focus, shownEdges])

  const detail = useMemo(() => {
    if (focus === null) return null
    const node = shown.find(n => n.id === focus)
    if (!node) return null
    return { node, props: parseProps(node.properties) }
  }, [focus, shown])

  const zoom = useCallback((factor: number) => {
    setView(v => ({ ...v, k: clamp(v.k * factor, 0.2, 4) }))
  }, [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setView(v => ({ ...v, k: clamp(v.k * (e.deltaY < 0 ? 1.12 : 0.89), 0.2, 4) }))
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const rect = svgRef.current?.getBoundingClientRect()
    // Pointer pixels are viewBox units only after the SVG's own scaling is undone.
    const scale = rect ? BOX_W / rect.width : 1
    setView(v => ({ ...v, x: d.vx + (e.clientX - d.x) * scale, y: d.vy + (e.clientY - d.y) * scale }))
  }

  const endDrag = () => {
    dragRef.current = null
  }

  if (shown.length === 0) {
    return <div className={cn("text-muted-foreground flex h-full items-center justify-center text-xs", className)}>{t("graph_no_nodes")}</div>
  }

  return (
    <div className={cn("bg-muted/20 relative h-full w-full overflow-hidden rounded-md border", className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${BOX_W} ${BOX_H}`}
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClick={e => {
          if (e.target === svgRef.current) setSelected(null)
        }}
      >
        <defs>
          <marker id="graph-arrow" markerWidth="9" markerHeight="9" refX="8" refY="3" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L8,3 L0,6 Z" className="fill-muted-foreground/70" />
          </marker>
        </defs>

        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          <g className="text-muted-foreground">
            {shownEdges.map((e, i) => {
              const a = positions.get(e.src)
              const b = positions.get(e.dst)
              if (!a || !b) return null
              const dim = neighbours !== null && !(neighbours.has(e.src) && neighbours.has(e.dst))
              return (
                <EdgeShape
                  key={`${e.id}-${i}`}
                  edge={e}
                  from={a}
                  to={b}
                  curve={curveOffset(shownEdges, i)}
                  dim={dim}
                  showLabel={shownEdges.length <= 40 || !dim}
                />
              )
            })}
          </g>

          {shown.map(n => {
            const p = positions.get(n.id)
            if (!p) return null
            const dim = neighbours !== null && !neighbours.has(n.id)
            const isFocus = focus === n.id
            return (
              <g
                key={n.id}
                transform={`translate(${p.x} ${p.y})`}
                className={cn("cursor-pointer transition-opacity", dim && "opacity-25")}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(h => (h === n.id ? null : h))}
                onClick={ev => {
                  ev.stopPropagation()
                  setSelected(s => (s === n.id ? null : n.id))
                }}
              >
                <circle r={NODE_R} fill={colorOf(n)} className={cn("stroke-background", isFocus ? "stroke-[3px]" : "stroke-[1.5px]")} />
                {isFocus && <circle r={NODE_R + 4} fill="none" stroke={colorOf(n)} strokeWidth={1.5} opacity={0.5} />}
                <text y={NODE_R + 14} textAnchor="middle" className="fill-foreground pointer-events-none text-[11px]">
                  {caption(n)}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      <div className="absolute top-2 right-2 flex items-center gap-1">
        <Button size="icon-sm" variant="outline" aria-label={t("graph_zoom_out")} onClick={() => zoom(0.8)}>
          <MinusIcon />
        </Button>
        <Button size="icon-sm" variant="outline" aria-label={t("graph_zoom_in")} onClick={() => zoom(1.25)}>
          <PlusIcon />
        </Button>
        <Button size="icon-sm" variant="outline" aria-label={t("graph_reset_view")} onClick={() => setView({ x: 0, y: 0, k: 1 })}>
          <MaximizeIcon />
        </Button>
      </div>

      {nodes.length > shown.length && (
        <div className="absolute top-2 left-2">
          <Badge variant="secondary">{t("graph_truncated", { shown: shown.length, total: nodes.length })}</Badge>
        </div>
      )}

      {detail && (
        <div className="bg-background/85 absolute bottom-2 left-2 max-h-[45%] w-64 overflow-auto rounded-md border p-2.5 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center gap-1">
            {(detail.node.labels ?? []).map(l => (
              <Badge key={l} variant="secondary" className="border-transparent" style={{ backgroundColor: `${colorOf(detail.node)}26` }}>
                {l}
              </Badge>
            ))}
            <span className="text-muted-foreground ml-auto font-mono text-[11px]">#{detail.node.id}</span>
          </div>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
            {Object.entries(detail.props).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground truncate">{k}</dt>
                <dd className="truncate font-mono">{typeof v === "string" ? v : JSON.stringify(v)}</dd>
              </div>
            ))}
          </dl>
          {Object.keys(detail.props).length === 0 && <p className="text-muted-foreground mt-2 text-xs">{t("graph_no_properties")}</p>}
        </div>
      )}
    </div>
  )
}

function EdgeShape({ edge, from, to, curve, dim, showLabel }: { edge: GraphEdge; from: Point; to: Point; curve: number; dim: boolean; showLabel: boolean }) {
  const self = edge.src === edge.dst
  const geom = self ? selfLoop(from) : straight(from, to, curve)

  return (
    <g className={cn("transition-opacity", dim && "opacity-15")}>
      <path d={geom.path} fill="none" stroke="currentColor" strokeOpacity={0.45} strokeWidth={1.4} markerEnd="url(#graph-arrow)" />
      {showLabel && edge.type && (
        <text x={geom.mid.x} y={geom.mid.y} textAnchor="middle" className="fill-muted-foreground pointer-events-none text-[10px]">
          {edge.type}
        </text>
      )}
    </g>
  )
}

// Stops short of the node's edge so the arrowhead lands on the rim rather than
// under the circle.
function straight(from: Point, to: Point, curve: number) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len

  const start = { x: from.x + ux * NODE_R, y: from.y + uy * NODE_R }
  const end = { x: to.x - ux * (NODE_R + 3), y: to.y - uy * (NODE_R + 3) }
  const mid = {
    x: (start.x + end.x) / 2 - uy * curve,
    y: (start.y + end.y) / 2 + ux * curve,
  }

  return { path: `M${start.x},${start.y} Q${mid.x},${mid.y} ${end.x},${end.y}`, mid: { x: mid.x, y: mid.y - 4 } }
}

function selfLoop(at: Point) {
  const r = NODE_R * 1.6
  const path = `M${at.x - NODE_R * 0.6},${at.y - NODE_R * 0.7} A${r},${r} 0 1,1 ${at.x + NODE_R * 0.6},${at.y - NODE_R * 0.7}`
  return { path, mid: { x: at.x, y: at.y - NODE_R * 2.4 } }
}

// Parallel edges between the same pair fan out instead of stacking into one line.
function curveOffset(edges: GraphEdge[], index: number) {
  const e = edges[index]
  const siblings = edges.filter(o => (o.src === e.src && o.dst === e.dst) || (o.src === e.dst && o.dst === e.src))
  if (siblings.length < 2) return 0
  const rank = siblings.findIndex(o => o === e)
  return (rank - (siblings.length - 1) / 2) * 34
}

function labelColors(nodes: GraphNode[]) {
  const labels: string[] = []
  for (const n of nodes) {
    const l = n.labels?.[0] ?? ""
    if (!labels.includes(l)) labels.push(l)
  }
  return (n: GraphNode) => PALETTE[Math.max(0, labels.indexOf(n.labels?.[0] ?? "")) % PALETTE.length]
}

function caption(n: GraphNode) {
  const props = parseProps(n.properties)
  const pick = ["name", "title", "label", "id", "key"].map(k => props[k]).find(v => typeof v === "string" && v)
  const text = (pick as string) ?? n.labels?.[0] ?? `#${n.id}`
  return text.length > 16 ? `${text.slice(0, 15)}…` : text
}

function parseProps(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}")
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

// Fruchterman-Reingold: repulsion between every pair, attraction along edges,
// cooling step. Iterations fall as the graph grows so the layout of the largest
// result still lands in well under a frame budget's worth of work.
function layout(nodes: GraphNode[], edges: GraphEdge[]): Map<number, Point> {
  const n = nodes.length
  const out = new Map<number, Point>()
  if (n === 0) return out
  if (n === 1) {
    out.set(nodes[0].id, { x: BOX_W / 2, y: BOX_H / 2 })
    return out
  }

  const index = new Map(nodes.map((node, i) => [node.id, i]))
  const px = new Float64Array(n)
  const py = new Float64Array(n)
  const radius = Math.min(BOX_W, BOX_H) * 0.38
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n
    px[i] = BOX_W / 2 + Math.cos(a) * radius
    py[i] = BOX_H / 2 + Math.sin(a) * radius
  }

  const links: Array<[number, number]> = []
  for (const e of edges) {
    const a = index.get(e.src)
    const b = index.get(e.dst)
    if (a !== undefined && b !== undefined && a !== b) links.push([a, b])
  }

  const k = Math.sqrt((BOX_W * BOX_H) / n)
  const iterations = n <= 60 ? 300 : n <= 150 ? 180 : 90
  const dx = new Float64Array(n)
  const dy = new Float64Array(n)
  let temp = BOX_W / 10

  for (let step = 0; step < iterations; step++) {
    dx.fill(0)
    dy.fill(0)

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let vx = px[i] - px[j]
        let vy = py[i] - py[j]
        let dist = Math.hypot(vx, vy)
        if (dist < 0.01) {
          // Two nodes exactly on top of each other have no direction to push
          // apart along; nudge them off each other deterministically.
          vx = ((i % 7) - 3) / 10 || 0.1
          vy = ((j % 5) - 2) / 10 || 0.1
          dist = Math.hypot(vx, vy)
        }
        const force = (k * k) / dist / dist
        dx[i] += vx * force
        dy[i] += vy * force
        dx[j] -= vx * force
        dy[j] -= vy * force
      }
    }

    for (const [a, b] of links) {
      const vx = px[a] - px[b]
      const vy = py[a] - py[b]
      const dist = Math.hypot(vx, vy) || 0.01
      const force = dist / k
      dx[a] -= vx * force
      dy[a] -= vy * force
      dx[b] += vx * force
      dy[b] += vy * force
    }

    for (let i = 0; i < n; i++) {
      const disp = Math.hypot(dx[i], dy[i]) || 1
      px[i] += (dx[i] / disp) * Math.min(disp, temp)
      py[i] += (dy[i] / disp) * Math.min(disp, temp)
    }
    temp *= 0.95
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i < n; i++) {
    minX = Math.min(minX, px[i])
    maxX = Math.max(maxX, px[i])
    minY = Math.min(minY, py[i])
    maxY = Math.max(maxY, py[i])
  }
  const pad = NODE_R * 2.5
  const scale = Math.min((BOX_W - pad * 2) / Math.max(maxX - minX, 1), (BOX_H - pad * 2) / Math.max(maxY - minY, 1), 1.6)
  const offX = (BOX_W - (maxX - minX) * scale) / 2
  const offY = (BOX_H - (maxY - minY) * scale) / 2

  for (let i = 0; i < n; i++) {
    out.set(nodes[i].id, { x: (px[i] - minX) * scale + offX, y: (py[i] - minY) * scale + offY })
  }
  return out
}
