import { GroupDO } from "@/types/group.do"
import { ConnectionDo } from "@/types/connection.do"

export type TreeItem = {
  id: string
  name: string
  level?: number
  isGroup?: boolean
  isLeaf?: boolean
  group?: GroupDO
  connection?: ConnectionDo
  children?: TreeItem[]
}

export function filterTree(items: TreeItem[], keyword: string): TreeItem[] {
  const lower = keyword.toLowerCase()
  return items
    .map<TreeItem | null>(item => {
      const nameMatch = item.name.toLowerCase().includes(lower)
      const filteredChildren: TreeItem[] | undefined = item.children ? filterTree(item.children, keyword) : undefined
      if (nameMatch || (filteredChildren && filteredChildren.length > 0)) {
        return {
          ...item,
          children: nameMatch ? item.children : filteredChildren,
        }
      }
      return null
    })
    .filter((x): x is TreeItem => x !== null)
}

export function sortTree(items: TreeItem[]): TreeItem[] {
  return items
    .map(item => ({
      ...item,
      children: item.children ? sortTree(item.children) : undefined,
    }))
    .sort((a, b) => {
      if (a.isGroup && !b.isGroup) return -1
      if (!a.isGroup && b.isGroup) return 1

      return a.name.localeCompare(b.name, "en", { sensitivity: "base" })
    })
}
