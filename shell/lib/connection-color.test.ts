import { describe, expect, it } from "vitest"
import { isConnectionColor, resolveColor } from "./connection-color"

const groups = [
  { id: "g1", color: "blue" },
  { id: "g2", color: "" },
]

describe("resolveColor", () => {
  it("prefers the connection's own color", () => {
    expect(resolveColor({ color: "red", group_id: "g1" }, groups)).toBe("red")
  })

  it("falls back to the group's color", () => {
    expect(resolveColor({ color: "", group_id: "g1" }, groups)).toBe("blue")
  })

  it("has no color when neither sets one", () => {
    expect(resolveColor({ color: "", group_id: "g2" }, groups)).toBeUndefined()
    expect(resolveColor({ color: "", group_id: "" }, groups)).toBeUndefined()
    expect(resolveColor(undefined, groups)).toBeUndefined()
  })

  it("treats an unknown token as unset", () => {
    expect(resolveColor({ color: "chartreuse", group_id: "g1" }, groups)).toBe("blue")
    expect(resolveColor({ color: "chartreuse", group_id: "" }, groups)).toBeUndefined()
  })

  it("does not take inherited object keys for colors", () => {
    expect(isConnectionColor("constructor")).toBe(false)
    expect(isConnectionColor("toString")).toBe(false)
  })
})
