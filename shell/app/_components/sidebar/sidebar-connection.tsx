"use client"

import { createContext, useCallback, useContext, useMemo, useState, memo, type DragEvent } from "react"
import { useTranslation } from "react-i18next"

import { SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInput, SidebarMenu, toast } from "@tradalab/lyra/ui"
import { SidebarPanel } from "@tradalab/lyra/shell"
import { EditIcon, FolderPlusIcon, LockIcon, MoreHorizontal, PlugIcon, PlusIcon, RefreshCcwIcon, Trash2Icon, UnplugIcon } from "lucide-react"
import { TreeExpander, TreeIcon, TreeLabel, TreeNode, TreeNodeContent, TreeNodeTrigger, TreeProvider, TreeView } from "@tradalab/lyra/blocks"
import { filterTree, TreeItem } from "@/app/_components/tree"
import { buildDbTree, cn } from "@/lib/utils"
import { useAppContext } from "@/ctx/app.context"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@tradalab/lyra/ui"
import { useConfirm } from "@tradalab/lyra/blocks"
import { useConnection } from "@/app/_components/connection/connection.context"
import { ConnectionReq as ConnectionDO, GroupItem as GroupDO } from "@/types"
import { useDeleteGroup, useGroupList, useReorderGroups } from "@/hooks/api/group.api"
import { useConnectionList, useDeleteConnection, useReorderConnections } from "@/hooks/api/connection.api"
import { useGroup } from "@/app/_components/group/group.context"
import { useTabStore } from "@/stores/tab.store"
import { ConnectionStateDot, GroupStateSummary } from "@/app/_components/connection/connection-state-dot"
import { DropPosition, loadExpanded, planDrop, saveExpanded } from "@/lib/connection-tree"
import { ConnectionModeIcon } from "@/app/_components/connection/connection-icon"
import { CONNECTION_COLORS, isConnectionColor, resolveColor } from "@/lib/connection-color"

export function SidebarConnection() {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const { create: connectionCreate } = useConnection()
  const { create: groupCreate } = useGroup()

  const { data: groups = [], refetch: groupsRefetch } = useGroupList()
  const { data: databases = [], refetch: databasesRefetch } = useConnectionList()

  const dataset = useMemo(() => buildDbTree(groups, databases), [groups, databases])

  const filteredDataset = useMemo(() => filterTree(dataset, keyword), [dataset, keyword])
  const groupMembers = useMemo(() => new Map(dataset.filter(i => i.isGroup).map(g => [g.id, g.children?.map(c => c.id) ?? []])), [dataset])

  const [expanded, setExpanded] = useState(loadExpanded)
  const [filterExpanded, setFilterExpanded] = useState<{ keyword: string; ids: Set<string> } | null>(null)
  const filtering = keyword.trim() !== ""
  const shownExpanded = useMemo(() => {
    if (!filtering) return expanded
    if (filterExpanded?.keyword === keyword) return filterExpanded.ids
    return new Set(filteredDataset.filter(i => i.isGroup).map(i => i.id))
  }, [filtering, keyword, filterExpanded, filteredDataset, expanded])
  const onExpandedChange = useCallback(
    (ids: Set<string>) => {
      if (filtering) {
        setFilterExpanded({ keyword, ids })
        return
      }
      setExpanded(ids)
      saveExpanded(ids)
    },
    [filtering, keyword]
  )

  const refetch = () => {
    groupsRefetch()
    databasesRefetch()
  }

  const reorderGroups = useReorderGroups()
  const reorderConnections = useReorderConnections()
  const [drag, setDrag] = useState<{ id: string; isGroup: boolean } | null>(null)
  const [dropTarget, setDropTarget] = useState<{ id: string; pos: DropPosition } | null>(null)
  const dragEnd = useCallback(() => {
    setDrag(null)
    setDropTarget(null)
  }, [])
  const drop = useCallback(
    async (targetId: string, pos: DropPosition) => {
      const plan = drag && planDrop(dataset, drag.id, targetId, pos)
      dragEnd()
      if (!plan) return
      try {
        if (plan.kind === "group") {
          await reorderGroups.mutateAsync(plan.ids)
        } else {
          if (plan.groupId && !expanded.has(plan.groupId)) onExpandedChange(new Set([...expanded, plan.groupId]))
          await reorderConnections.mutateAsync({ groupId: plan.groupId, ids: plan.ids })
        }
      } catch (e: any) {
        const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
        toast.add({ title: msg, type: "error" })
      }
    },
    [drag, dataset, dragEnd, expanded, onExpandedChange, reorderGroups, reorderConnections, t]
  )
  const dnd = useMemo<TreeDnd>(
    () => ({ enabled: !filtering, drag, dropTarget, setDrag, setDropTarget, drop, dragEnd }),
    [filtering, drag, dropTarget, drop, dragEnd]
  )
  const rootDropping = dropTarget?.id === ""

  return (
    <>
      <SidebarPanel variant="sidebar" className="flex flex-1 w-[calc(var(--sidebar-width)-var(--sidebar-width-icon)-2px)]!">
        <SidebarHeader className="gap-2 border-b p-2">
          <div className="flex items-center justify-between">
            <div className="text-base font-medium">{t("connections")}</div>
            <div className="flex gap-2">
              <RefreshCcwIcon className="h-4 w-4 cursor-pointer" onClick={refetch} />
              <FolderPlusIcon className="h-4 w-4 cursor-pointer" onClick={groupCreate} />
              <PlusIcon className="h-4 w-4 cursor-pointer" onClick={connectionCreate} />
            </div>
          </div>
          <SidebarInput placeholder={t("filter")} onChange={e => setKeyword(e.target.value)} />
        </SidebarHeader>

        <SidebarContent
          className={cn(rootDropping && "ring-1 ring-inset ring-primary")}
          onDragOver={e => {
            if (!drag || drag.isGroup) return
            if ((e.target as Element).closest("[data-dnd-tree]")) {
              if (rootDropping) setDropTarget(null)
              return
            }
            e.preventDefault()
            if (!rootDropping) setDropTarget({ id: "", pos: "inside" })
          }}
          onDragLeave={e => {
            if (rootDropping && !e.currentTarget.contains(e.relatedTarget as Node | null)) setDropTarget(null)
          }}
          onDrop={e => {
            e.preventDefault()
            if (rootDropping) drop("", "inside")
            else dragEnd()
          }}
        >
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu>
                <TreeProvider
                  expandedIds={shownExpanded}
                  onExpandedChange={onExpandedChange}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  multiSelect
                >
                  <TreeDndContext.Provider value={dnd}>
                    <TreeView className="px-1 py-2" data-dnd-tree>
                      {filteredDataset.map((item: TreeItem) => (
                        <RenderTreeItem key={item.id} item={item} memberIds={groupMembers.get(item.id)} reload={refetch} />
                      ))}
                    </TreeView>
                  </TreeDndContext.Provider>
                </TreeProvider>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </SidebarPanel>
    </>
  )
}

type TreeDnd = {
  enabled: boolean
  drag: { id: string; isGroup: boolean } | null
  dropTarget: { id: string; pos: DropPosition } | null
  setDrag: (drag: { id: string; isGroup: boolean }) => void
  setDropTarget: (target: { id: string; pos: DropPosition } | null) => void
  drop: (targetId: string, pos: DropPosition) => void
  dragEnd: () => void
}

const TreeDndContext = createContext<TreeDnd | null>(null)

function dropPositionAt(e: DragEvent<HTMLElement>, item: TreeItem, dragIsGroup: boolean): DropPosition | null {
  if (dragIsGroup !== Boolean(item.isGroup)) return !dragIsGroup && item.isGroup ? "inside" : null
  const rect = e.currentTarget.getBoundingClientRect()
  return e.clientY < rect.top + rect.height / 2 ? "before" : "after"
}

type RenderTreeItemProps = {
  item: TreeItem
  memberIds?: string[]
  reload: () => void
}

function RenderTreeItem({ item, memberIds, reload }: RenderTreeItemProps) {
  const { t } = useTranslation()
  const { connect, selectedDb } = useAppContext()
  const isActive = !item.isGroup && item.id === selectedDb
  const readOnly = !item.isGroup && Boolean(item.connection?.read_only)
  const { data: groups = [] } = useGroupList()
  const groupColor = item.group?.color
  const color = item.isGroup ? (isConnectionColor(groupColor) ? groupColor : undefined) : resolveColor(item.connection, groups)
  const dnd = useContext(TreeDndContext)
  const dropPos = dnd?.dropTarget?.id === item.id ? dnd.dropTarget.pos : null

  return (
    <TreeNode
      nodeId={item.id}
      level={item.level}
      isLast={item.level === 0}
      onDoubleClick={
        !item.isGroup
          ? async e => {
              e.stopPropagation()
              if (item.connection) {
                await connect(item.connection, item.connection.last_db || 0)
              }
            }
          : undefined
      }
    >
      <TreeNodeTrigger
        className={cn(
          "group/item px-1 py-1.5",
          isActive && "bg-accent text-accent-foreground font-medium rounded-md",
          dnd?.drag?.id === item.id && "opacity-50",
          dropPos === "before" && "shadow-[inset_0_2px_0_0_var(--primary)]",
          dropPos === "after" && "shadow-[inset_0_-2px_0_0_var(--primary)]",
          dropPos === "inside" && "rounded-md ring-1 ring-inset ring-primary"
        )}
        draggable={dnd?.enabled}
        onDragStart={e => {
          e.stopPropagation()
          e.dataTransfer.effectAllowed = "move"
          // Some engines start no drag without a payload.
          e.dataTransfer.setData("text/plain", item.id)
          dnd?.setDrag({ id: item.id, isGroup: Boolean(item.isGroup) })
        }}
        onDragEnd={() => dnd?.dragEnd()}
        onDragLeave={e => {
          if (dropPos && !e.currentTarget.contains(e.relatedTarget as Node | null)) dnd?.setDropTarget(null)
        }}
        onDragOver={e => {
          if (!dnd?.drag) return
          e.stopPropagation()
          const pos = dropPositionAt(e, item, dnd.drag.isGroup)
          if (!pos || dnd.drag.id === item.id) {
            if (dnd.dropTarget) dnd.setDropTarget(null)
            return
          }
          e.preventDefault()
          if (dnd.dropTarget?.id !== item.id || dnd.dropTarget.pos !== pos) dnd.setDropTarget({ id: item.id, pos })
        }}
        onDrop={e => {
          e.preventDefault()
          e.stopPropagation()
          if (dropPos) dnd?.drop(item.id, dropPos)
          else dnd?.dragEnd()
        }}
      >
        <TreeExpander hasChildren={item.isGroup} />
        <TreeIcon
          hasChildren={item.isGroup}
          icon={item.isGroup ? undefined : <ConnectionModeIcon mode={item.connection?.mode} />}
          className={color && CONNECTION_COLORS[color].tint}
        />
        <TreeLabel>{item.name}</TreeLabel>
        {!item.isGroup && <ConnectionStateDot connectionId={item.id} className="ml-1.5" />}
        {item.isGroup && <GroupStateSummary connectionIds={memberIds ?? []} className="ml-1.5" />}
        {readOnly && (
          <span title={t("read_only")} className="ml-auto mr-0.5 inline-flex shrink-0">
            <LockIcon className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          </span>
        )}
        <ActionButton item={item} reload={reload} />
      </TreeNodeTrigger>

      {item.isGroup && item.children && (
        <TreeNodeContent hasChildren>
          {item.children.map((child: TreeItem) => (
            <RenderTreeItem key={child.id} item={child} reload={reload} />
          ))}
        </TreeNodeContent>
      )}
    </TreeNode>
  )
}

type ActionButtonProps = {
  item: TreeItem
  reload: () => void
}

const ActionButton = memo(function ActionButton({ item, reload }: ActionButtonProps) {
  const { t } = useTranslation()
  const { connect, disconnect } = useAppContext()
  const confirm = useConfirm()
  const { edit: connectionEdit } = useConnection()
  const { edit: groupEdit } = useGroup()
  const deleteConnection = useDeleteConnection()
  const deleteGroup = useDeleteGroup()

  const deleteItem = async () => {
    try {
      const ok = await confirm({
        title: t("confirm_delete"),
        description: t("confirm_delete_desc", { obj_name: item.isGroup ? "group" : "connection", obj_key: item.name }),
        confirmText: t("delete"),
        danger: true,
      })
      if (!ok) {
        return
      }
      if (item.isGroup) {
        await deleteGroup.mutateAsync(item.id)
      } else {
        await deleteConnection.mutateAsync(item.id)
        useTabStore.getState().removeConnectionTabs(item.id)
      }
      toast.add({ title: "Deleted!", type: "success" })
      reload()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.add({ title: msg, type: "error" })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="cursor-pointer ml-1 opacity-0 group-hover/item:opacity-100">
          <MoreHorizontal className="h-4 w-4" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start">
        {!item.isGroup && item.connection && (
          <>
            <DropdownMenuItem
              onClick={e => {
                e.stopPropagation()
                connect(item.connection, item.connection?.last_db || 0)
              }}
            >
              <PlugIcon className="h-4 w-4" />
              {t("connect")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={e => {
                e.stopPropagation()
                disconnect(item.connection)
              }}
            >
              <UnplugIcon className="h-4 w-4" />
              {t("disconnect")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={e => {
                e.stopPropagation()
                connectionEdit(item.connection as ConnectionDO)
              }}
            >
              <EditIcon className="h-4 w-4" />
              {t("update")}
            </DropdownMenuItem>
          </>
        )}
        {item.isGroup && item.group && (
          <DropdownMenuItem
            onClick={e => {
              e.stopPropagation()
              groupEdit(item.group as GroupDO)
            }}
          >
            <EditIcon className="h-4 w-4" />
            {t("update")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="text-red-600"
          onClick={e => {
            e.stopPropagation()
            deleteItem()
          }}
        >
          <Trash2Icon className="h-4 w-4" />
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})
