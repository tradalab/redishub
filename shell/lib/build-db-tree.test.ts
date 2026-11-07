import { describe, expect, it } from "vitest"
import type { ConnectionReq, GroupItem } from "@/types"
import { buildDbTree } from "./utils"

const group = (id: string, sort_order = 0) => ({ id, name: id, sort_order }) as GroupItem
const conn = (id: string, group_id = "", sort_order = 0) => ({ id, name: id, group_id, sort_order }) as ConnectionReq

describe("buildDbTree", () => {
  it("shows a connection whose group is gone at the top level", () => {
    const tree = buildDbTree([group("g1")], [conn("a", "g1"), conn("lost", "deleted"), conn("top")])
    expect(tree.map(i => i.id)).toEqual(["g1", "lost", "top"])
    expect(tree[0]?.children?.map(i => i.id)).toEqual(["a"])
  })

  it("orders by sort_order, then by name naturally", () => {
    const tree = buildDbTree([], [conn("s10"), conn("s2"), conn("B"), conn("a"), conn("first", "", -1)])
    expect(tree.map(i => i.id)).toEqual(["first", "a", "B", "s2", "s10"])
  })
})
