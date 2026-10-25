import { describe, expect, it } from "vitest"
import { prefixChildren, squarify } from "./treemap"

describe("squarify", () => {
  const rect = { x: 0, y: 0, w: 600, h: 400 }

  it("fills the rect with areas proportional to value", () => {
    const tiles = squarify([6, 6, 4, 3, 2, 2, 1], v => v, rect)
    expect(tiles).toHaveLength(7)
    const total = tiles.reduce((s, t) => s + t.w * t.h, 0)
    expect(total).toBeCloseTo(600 * 400)
    for (const t of tiles) {
      expect((t.w * t.h) / total).toBeCloseTo(t.item / 24)
      expect(t.x + t.w).toBeLessThanOrEqual(600 + 1e-6)
      expect(t.y + t.h).toBeLessThanOrEqual(400 + 1e-6)
    }
  })

  it("drops empty items and empty input", () => {
    expect(squarify([0, 5], v => v, rect).map(t => t.item)).toEqual([5])
    expect(squarify([], (v: number) => v, rect)).toEqual([])
  })
})

describe("prefixChildren", () => {
  const all = [
    { prefix: "user", depth: 1, keys: 3, bytes: 160 },
    { prefix: "user:1", depth: 2, keys: 2, bytes: 150 },
    { prefix: "session", depth: 1, keys: 1, bytes: 7 },
  ]

  it("lists top-level prefixes and the keys outside them", () => {
    expect(prefixChildren(all, null, ":", 5, 1166)).toEqual([
      { prefix: "user", keys: 3, bytes: 160, hasChildren: true },
      { prefix: "session", keys: 1, bytes: 7, hasChildren: false },
      { prefix: null, keys: 1, bytes: 999 },
    ])
  })

  it("lists one level under a prefix", () => {
    expect(prefixChildren(all, "user", ":", 3, 160)).toEqual([
      { prefix: "user:1", keys: 2, bytes: 150, hasChildren: false },
      { prefix: null, keys: 1, bytes: 10 },
    ])
  })

  it("opens an empty first segment instead of returning to the root", () => {
    const slash = [
      { prefix: "", depth: 1, keys: 2, bytes: 30 },
      { prefix: "/api", depth: 2, keys: 2, bytes: 30 },
    ]
    expect(prefixChildren(slash, null, "/", 2, 30)).toEqual([{ prefix: "", keys: 2, bytes: 30, hasChildren: true }])
    expect(prefixChildren(slash, "", "/", 2, 30)).toEqual([{ prefix: "/api", keys: 2, bytes: 30, hasChildren: false }])
  })
})
