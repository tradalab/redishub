"use client"

import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInput, SidebarMenu } from "@/components/ui/sidebar"
import { ArrowDownToLineIcon, ListEndIcon, MoreHorizontal, PlusIcon, RefreshCcwIcon, Trash2Icon } from "lucide-react"
import { filterTree, sortTree, TreeItem } from "@/components/app/tree"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { useAppContext } from "@/ctx/app.context"
import { TreeExpander, TreeIcon, TreeLabel, TreeNode, TreeNodeContent, TreeNodeTrigger, TreeProvider, TreeView } from "../../ui/kibo-ui/tree"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { BrowserAddKeyDialog } from "@/components/app/browser-add-key-dialog"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatabaseDO } from "@/types/database.do"
import scorix from "@/lib/scorix"
import { useRedisKeys } from "@/hooks/use-redis-keys"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function SidebarBrowser() {
  const [dataset, setDataset] = useState<TreeItem[]>([])
  const [keyword, setKeyword] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [expandedIds] = useState<string[]>([])
  const [dbs, setDbs] = useState<any[]>([])

  const { connect, selectedDb, setSelectedDbIdx, selectedDbIdx } = useAppContext()
  const { keys, isLoading, loadMore, loadAll, reload, deleteKey } = useRedisKeys(selectedDb || "", selectedDbIdx)

  useEffect(() => {
    loadInfo()
  }, [selectedDb, selectedDbIdx])

  useEffect(() => {
    reload()
  }, [selectedDb, selectedDbIdx])

  useEffect(() => {
    setDataset([...sortTree(buildTree(keys))])
  }, [keys.length])

  const buildTree = (keys: string[], delimiter = ":"): TreeItem[] => {
    const root: TreeItem[] = []

    for (const key of keys) {
      const parts = key.split(delimiter)
      let currentLevel = root

      parts.forEach((part, index) => {
        let node = currentLevel.find(n => n.name === part)
        if (!node) {
          node = {
            id: parts.slice(0, index + 1).join(delimiter), // id = path
            name: part,
            isGroup: index < parts.length - 1,
            level: index,
            children: [],
          }
          currentLevel.push(node)
        }
        if (index < parts.length - 1) {
          if (!node.children) node.children = []
          currentLevel = node.children
        }
      })
    }

    return root
  }

  const loadInfo = async () => {
    if (!selectedDb) {
      return
    }
    try {
      const res = await scorix.invoke<{ databases: any[] }>("client:general", { database_id: selectedDb, database_index: selectedDbIdx })
      setDbs(res.databases || [])
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"
      toast.error(msg)
    }
  }

  const filteredDataset = useMemo(() => {
    return filterTree(dataset, keyword)
  }, [dataset, keyword])

  const onChangeDbIdx = async (idx: number) => {
    try {
      const databases = await scorix.invoke<DatabaseDO[]>("ext:gorm:Query", `SELECT *FROM "database" WHERE id = "${selectedDb}" AND deleted_at IS NULL`)
      if (!databases || databases.length < 1) {
        toast.error("database does not exist")
        return
      }
      await connect(databases[0], idx)
      setSelectedDbIdx(idx)
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"
      toast.error(msg)
    }
  }

  if (!selectedDb) {
    setDataset([])
    return null
  }

  return (
    <Sidebar variant="sidebar" collapsible="none" className="flex flex-1 w-[calc(var(--sidebar-width)-var(--sidebar-width-icon)-2px)]!">
      <SidebarHeader className="gap-2 border-b p-2">
        <div className="flex w-full items-center justify-between">
          <div className="text-foreground text-base font-medium">Browser</div>
          <div className="flex gap-3.5">
            <RefreshCcwIcon className="h-4 w-4 cursor-pointer" onClick={() => reload()} />
            <BrowserAddKeyDialog>
              <PlusIcon className="h-4 w-4 cursor-pointer" />
            </BrowserAddKeyDialog>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={selectedDbIdx.toString()} onValueChange={val => onChangeDbIdx(Number(val))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select DB" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {dbs.map(db => (
                  <SelectItem key={db.index} value={db.index?.toString()}>
                    {db.name} {selectedDbIdx == db.index ? `(${keys.length}/${db.keys})` : `(${db.keys})`}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button size="icon-sm" variant="outline" title="Load More" disabled={isLoading} onClick={loadMore}>
            {isLoading ? <Spinner /> : <ArrowDownToLineIcon />}
          </Button>
          <Button size="icon-sm" variant="outline" title="Load All" disabled={isLoading} onClick={loadAll}>
            {isLoading ? <Spinner /> : <ListEndIcon />}
          </Button>
        </div>
        <SidebarInput placeholder="Filter" onChange={e => setKeyword(e?.target?.value)} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <TreeProvider defaultExpandedIds={expandedIds} selectedIds={selectedIds} onSelectionChange={setSelectedIds} multiSelect>
                <TreeView className="py-2 px-1">
                  {filteredDataset.map((item, index) => (
                    <RenderTreeItem key={index} item={item} deleteKey={deleteKey} />
                  ))}
                </TreeView>
              </TreeProvider>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

function RenderTreeItem({ item, deleteKey }: { item: TreeItem; deleteKey: (key: string) => Promise<void> }) {
  const { setSelectedKey, setSelectedSection } = useAppContext()

  const selectKey = () => {
    setSelectedKey(item.id)
    setSelectedSection("key-detail")
  }

  if (!item.isGroup) {
    return (
      <TreeNode nodeId={item.id} isLast={item.level == 0} level={item.level}>
        <TreeNodeTrigger className="cursor-default px-1 py-1.5 group/item" onClick={selectKey}>
          <TreeExpander />
          <TreeIcon />
          <TreeLabel>{item.name}</TreeLabel>
          <ActionButton item={item} deleteKey={deleteKey} />
        </TreeNodeTrigger>
      </TreeNode>
    )
  }

  return (
    <TreeNode nodeId={item.id} level={item.level} isLast={item.level == 0}>
      <TreeNodeTrigger className="cursor-default px-1 py-1.5 group/item">
        <TreeExpander hasChildren />
        <TreeIcon hasChildren />
        <TreeLabel>{item.name}</TreeLabel>
        <ActionButton item={item} deleteKey={deleteKey} />
      </TreeNodeTrigger>
      <TreeNodeContent hasChildren>
        {item.children?.map((item, index) => (
          <RenderTreeItem key={index} item={item} deleteKey={deleteKey} />
        ))}
      </TreeNodeContent>
    </TreeNode>
  )
}

const ActionButton = ({ item, deleteKey }: { item: TreeItem; deleteKey: (key: string) => Promise<void> }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="cursor-pointer ml-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
          <MoreHorizontal className="h-4 w-4" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="min-w-56 rounded-lg">
        <DropdownMenuItem
          className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
          onClick={async e => {
            e.stopPropagation()
            await deleteKey(item.id)
          }}
          disabled={item.isGroup}
        >
          <Trash2Icon className="h-4 w-4 text-red-600" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
