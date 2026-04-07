"use client"

import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInput, SidebarMenu } from "@/components/ui/sidebar"
import {
  ArrowDownToLineIcon,
  ListEndIcon,
  MoreHorizontal,
  PlusIcon,
  RefreshCcwIcon,
  Trash2Icon,
  TerminalIcon,
  ActivityIcon,
  DatabaseIcon,
  RadioIcon,
  LayoutGridIcon,
} from "lucide-react"
import { filterTree, flattenTree, sortTree, TreeItem, FlattenedTreeItem } from "@/components/app/tree"
import { useDeferredValue, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { useAppContext } from "@/ctx/app.context"
import { TreeExpander, TreeIcon, TreeLabel, TreeNode, TreeNodeTrigger, TreeProvider, TreeView } from "../../ui/trada-ui/tree"
import { Virtuoso } from "react-virtuoso"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { BrowserAddKeyDialog } from "@/components/app/browser-add-key-dialog"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConnectionDO } from "@/types/connection.do"
import scorix from "@/lib/scorix"
import { useRedisKeys } from "@/hooks/use-redis-keys"
import { useConnectionList } from "@/hooks/api/connection.api"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useTranslation } from "react-i18next"
import { useConfirm } from "@/components/ui/trada-ui/confirm/use-confirm"
import { useTabStore } from "@/stores/tab.store"

export function SidebarBrowser() {
  const { t } = useTranslation()
  const [dataset, setDataset] = useState<TreeItem[]>([])
  const [keyword, setKeyword] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [dbs, setDbs] = useState<any[]>([])
  const confirm = useConfirm()

  const { connect, selectedDb, setSelectedDbIdx, selectedDbIdx } = useAppContext()
  const { addTab } = useTabStore()
  const { data: connectionList = [] } = useConnectionList()
  const currentConnection = connectionList.find(c => c.id === selectedDb)
  const { keys, isLoading, loadMore, loadAll, reload, deleteKey } = useRedisKeys(selectedDb || "", selectedDbIdx, currentConnection?.key_size)

  const [isBuildingTree, setIsBuildingTree] = useState(false)

  useEffect(() => {
    loadInfo()
  }, [selectedDb, selectedDbIdx])

  useEffect(() => {
    reload()
  }, [selectedDb, selectedDbIdx])

  useEffect(() => {
    if (keys.length === 0) {
      setDataset([])
      return
    }
    setIsBuildingTree(true)
    const timer = setTimeout(() => {
      setDataset(sortTree(buildTree(keys)))
      setIsBuildingTree(false)
    }, 50)
    return () => clearTimeout(timer)
  }, [keys])

  const handleDelete = async (key: string) => {
    if (isLoading) return
    const ok = await confirm({
      title: t("confirm_delete"),
      description: t("confirm_delete_desc", { obj_name: "key", obj_key: key }),
      confirmText: t("delete"),
      danger: true,
    })
    if (ok) {
      await deleteKey(key)
    }
  }

  const buildTree = (keys: string[], delimiter = ":"): TreeItem[] => {
    const root: TreeItem[] = []
    const cache = new Map<string, TreeItem>()

    for (const key of keys) {
      const parts = key.split(delimiter)
      let currentLevel = root
      let currentPath = ""

      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1
        const path = currentPath ? currentPath + delimiter + part : part
        currentPath = path
        const id = isLast ? path : "group__" + path

        let node = cache.get(id)

        if (!node) {
          node = {
            id,
            name: part,
            isLeaf: isLast,
            isGroup: !isLast,
            level: index,
            children: [],
            keyCount: 0,
          }
          cache.set(id, node)
          currentLevel.push(node)
        }

        if (!isLast) {
          node.keyCount = (node.keyCount || 0) + 1
          currentLevel = node.children!
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
      const res = await scorix.invoke<{ databases: any[] }>("client:general", { connection_id: selectedDb, database_index: selectedDbIdx })
      setDbs(res.databases || [])
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.error(msg)
    }
  }

  const deferredKeyword = useDeferredValue(keyword)

  const filteredDataset = useMemo(() => {
    return filterTree(dataset, deferredKeyword)
  }, [dataset, deferredKeyword])

  const flattenedData = useMemo(() => {
    return flattenTree(filteredDataset, expandedIds)
  }, [filteredDataset, expandedIds])

  const onChangeDbIdx = async (idx: number) => {
    try {
      const databases = await scorix.invoke<ConnectionDO[]>("mod:gorm:Query", {
        sql: `SELECT * FROM "connection" WHERE id = "${selectedDb}" AND deleted_at IS NULL`,
      })
      if (!databases || databases.length < 1) {
        toast.error(t("conn_not_exist"))
        return
      }
      await connect(databases[0], idx)
      setSelectedDbIdx(idx)
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
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
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <div className="text-foreground text-sm font-semibold truncate" title={currentConnection?.name || t("browser")}>
              {currentConnection?.name || t("browser")}
            </div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span className="flex size-1.5 rounded-full bg-green-500" />
              DB{selectedDbIdx}
            </div>
          </div>
          <div className="flex gap-2.5">
            <LayoutGridIcon
              className="h-4 w-4 cursor-pointer"
              onClick={() =>
                addTab({
                  type: "key-list",
                  title: t("key_list") + ` (DB ${selectedDbIdx})`,
                  connectionId: selectedDb!,
                  connectionName: currentConnection?.name,
                  databaseIdx: selectedDbIdx,
                })
              }
            />
            <DatabaseIcon
              className="h-4 w-4 cursor-pointer"
              onClick={() =>
                addTab({
                  type: "general",
                  title: currentConnection?.name || "General",
                  connectionId: selectedDb!,
                  connectionName: currentConnection?.name,
                  databaseIdx: selectedDbIdx,
                })
              }
            />
            <TerminalIcon
              className="h-4 w-4 cursor-pointer"
              onClick={() =>
                addTab({ type: "console", title: "Console", connectionId: selectedDb!, connectionName: currentConnection?.name, databaseIdx: selectedDbIdx })
              }
            />
            <RadioIcon
              className="h-4 w-4 cursor-pointer"
              onClick={() =>
                addTab({
                  type: "pubsub",
                  title: "Pub/Sub",
                  connectionId: selectedDb!,
                  connectionName: currentConnection?.name,
                  databaseIdx: selectedDbIdx,
                })
              }
            />
            <ActivityIcon
              className="h-4 w-4 cursor-pointer"
              onClick={() =>
                addTab({
                  type: "slow-query",
                  title: "Slow Query",
                  connectionId: selectedDb!,
                  connectionName: currentConnection?.name,
                  databaseIdx: selectedDbIdx,
                })
              }
            />
            <RefreshCcwIcon
              className="h-4 w-4 cursor-pointer"
              onClick={() => {
                if (isLoading) {
                  return
                }
                loadInfo()
                reload()
              }}
            />
            <BrowserAddKeyDialog>
              <PlusIcon className="h-4 w-4 cursor-pointer" />
            </BrowserAddKeyDialog>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={selectedDbIdx.toString()} onValueChange={val => onChangeDbIdx(Number(val))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("select_db")} />
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
          <Button size="icon-sm" variant="outline" title={"load_more"} disabled={isLoading} onClick={loadMore}>
            {isLoading ? <Spinner /> : <ArrowDownToLineIcon />}
          </Button>
          <Button size="icon-sm" variant="outline" title={"load_all"} disabled={isLoading} onClick={loadAll}>
            {isLoading ? <Spinner /> : <ListEndIcon />}
          </Button>
        </div>
        <SidebarInput placeholder={t("filter")} onChange={e => setKeyword(e?.target?.value)} />
      </SidebarHeader>
      <SidebarContent className="overflow-hidden! p-0 flex flex-col h-full">
        <SidebarGroup className="p-0 flex-1 min-h-0 flex flex-col">
          <SidebarGroupContent className="flex-1 min-h-0 flex flex-col">
            <SidebarMenu className="flex-1 min-h-0 flex flex-col">
              <TreeProvider
                className="flex flex-col flex-1 min-h-0"
                expandedIds={expandedIds}
                onExpandedChange={setExpandedIds}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                multiSelect
              >
                <TreeView className="p-0 flex flex-col flex-1 min-h-0 relative h-full">
                  {isBuildingTree && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                      <Spinner className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  {flattenedData.length === 0 && keys.length > 0 && !isBuildingTree && (
                    <div className="p-4 text-xs text-muted-foreground text-center">{t("no_keys_match")}</div>
                  )}
                  <div className="absolute inset-0">
                    <Virtuoso
                      className="h-full w-full"
                      data={flattenedData}
                      itemContent={(index, item) => (
                        <RenderTreeItem key={item.id} item={item} deleteKey={handleDelete} connectionName={currentConnection?.name} />
                      )}
                    />
                  </div>
                </TreeView>
              </TreeProvider>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

function RenderTreeItem({ item, deleteKey, connectionName }: { item: FlattenedTreeItem; deleteKey: (key: string) => Promise<void>; connectionName?: string }) {
  const { selectedDb, selectedDbIdx } = useAppContext()
  const { addTab } = useTabStore()

  const selectKey = () => {
    addTab({
      type: "key-detail",
      title: item.id,
      connectionId: selectedDb!,
      connectionName: connectionName,
      databaseIdx: selectedDbIdx,
      key: item.id,
    })
  }

  return (
    <TreeNode nodeId={item.id} isLast={item.isLast} level={item.depth} parentPath={item.parentPath}>
      <TreeNodeTrigger className="cursor-default px-1 py-1.5 group/item" onClick={item.isGroup ? undefined : selectKey}>
        <TreeExpander hasChildren={item.isGroup} />
        <TreeIcon hasChildren={item.isGroup} />
        <TreeLabel title={item.name}>
          {item.name || "[Empty]"} {item.isGroup && item.keyCount !== undefined && item.keyCount > 0 && `(${item.keyCount})`}
        </TreeLabel>
        <ActionButton item={item} deleteKey={deleteKey} />
      </TreeNodeTrigger>
    </TreeNode>
  )
}

const ActionButton = ({ item, deleteKey }: { item: TreeItem; deleteKey: (key: string) => Promise<void> }) => {
  const { t } = useTranslation()
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
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
