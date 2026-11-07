import { GroupItem as GroupDO, ConnectionReq as ConnectionDO } from "@/types"
import type { FlatTreeNode } from "@tradalab/lyra/blocks"

export type TreeItem = {
  id: string
  name: string
  level?: number
  isGroup?: boolean
  isLeaf?: boolean
  group?: GroupDO
  connection?: ConnectionDO
  children?: TreeItem[]
  keyCount?: number
}

export type FlattenedTreeItem = FlatTreeNode<TreeItem>
