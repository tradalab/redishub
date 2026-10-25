import { describe, expect, it } from "vitest"
import type { TreeItem } from "@/app/_components/tree"
import { planDrop } from "./connection-tree"

const conn = (id: string, group_id = ""): TreeItem => ({ id, name: id, connection: { group_id } as TreeItem["connection"] })
const tree: TreeItem[] = [
  { id: "g1", name: "g1", isGroup: true, children: [conn("a", "g1"), conn("b", "g1")] },
  { id: "g2", name: "g2", isGroup: true, children: [] },
  conn("x"),
  conn("y"),
]

describe("planDrop", () => {
  it("reorders groups among groups", () => {
    expect(planDrop(tree, "g2", "g1", "before")).toEqual({ kind: "group", ids: ["g2", "g1"] })
  })

  it("does not drop a group into a group or onto a connection", () => {
    expect(planDrop(tree, "g2", "g1", "inside")).toBeNull()
    expect(planDrop(tree, "g1", "x", "after")).toBeNull()
  })

  it("reorders connections inside their group", () => {
    expect(planDrop(tree, "b", "a", "before")).toEqual({ kind: "connection", groupId: "g1", ids: ["b", "a"] })
  })

  it("moves a connection next to one in another list", () => {
    expect(planDrop(tree, "x", "a", "after")).toEqual({ kind: "connection", groupId: "g1", ids: ["a", "x", "b"] })
    expect(planDrop(tree, "a", "y", "before")).toEqual({ kind: "connection", groupId: "", ids: ["x", "a", "y"] })
  })

  it("appends a connection dropped on a group or on the empty root", () => {
    expect(planDrop(tree, "x", "g2", "inside")).toEqual({ kind: "connection", groupId: "g2", ids: ["x"] })
    expect(planDrop(tree, "a", "", "inside")).toEqual({ kind: "connection", groupId: "", ids: ["x", "y", "a"] })
  })

  it("skips a drop that changes nothing", () => {
    expect(planDrop(tree, "a", "b", "before")).toBeNull()
    expect(planDrop(tree, "g1", "g2", "before")).toBeNull()
    expect(planDrop(tree, "y", "", "inside")).toBeNull()
    expect(planDrop(tree, "a", "a", "after")).toBeNull()
  })
})
