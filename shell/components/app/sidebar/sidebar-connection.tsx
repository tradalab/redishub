"use client"

import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInput, SidebarMenu } from "@/components/ui/sidebar"
import { EditIcon, FolderPlusIcon, MoreHorizontal, PlugIcon, PlusIcon, RefreshCcwIcon, ServerIcon, Trash2Icon, UnplugIcon } from "lucide-react"
import { useEffect, useMemo, useState, memo, useCallback } from "react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { GroupAddDialog } from "@/components/app/group-add-dialog"
import { GroupUpdateDialog } from "@/components/app/group-update-dialog"
import { ConnectionAddDialog } from "@/components/app/connection/connection-add-dialog"
import { ConnectionUpdateDialog } from "@/components/app/connection/connection-update-dialog"

import { TreeExpander, TreeIcon, TreeLabel, TreeNode, TreeNodeContent, TreeNodeTrigger, TreeProvider, TreeView } from "@/components/ui/trada-ui/tree"

import { filterTree, sortTree, TreeItem } from "@/components/app/tree"
import { buildDbTree } from "@/lib/utils"
import scorix from "@/lib/scorix"
import { useDbStore } from "@/stores/db.store"
import { useAppContext } from "@/ctx/app.context"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useConfirm } from "@/components/ui/trada-ui/confirm/use-confirm"

type DialogState<T> = {
  open: boolean
  data?: T
}

export function SidebarConnection() {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const { groups, databases, load } = useDbStore()

  const [editGroup, setEditGroup] = useState<DialogState<any>>({ open: false })
  const [editConnection, setEditConnection] = useState<DialogState<any>>({ open: false })

  const dataset = useMemo(() => sortTree(buildDbTree(groups, databases)), [groups, databases])

  const filteredDataset = useMemo(() => filterTree(dataset, keyword), [dataset, keyword])

  useEffect(() => {
    load()
  }, [load])

  return (
    <>
      <Sidebar variant="sidebar" collapsible="none" className="flex flex-1 w-[calc(var(--sidebar-width)-var(--sidebar-width-icon)-2px)]!">
        <SidebarHeader className="gap-2 border-b p-2">
          <div className="flex items-center justify-between">
            <div className="text-base font-medium">{t("connections")}</div>
            <div className="flex gap-2">
              <RefreshCcwIcon className="h-4 w-4 cursor-pointer" onClick={load} />
              <GroupAddDialog>
                <FolderPlusIcon className="h-4 w-4 cursor-pointer" />
              </GroupAddDialog>
              <ConnectionAddDialog>
                <PlusIcon className="h-4 w-4 cursor-pointer" />
              </ConnectionAddDialog>
            </div>
          </div>
          <SidebarInput placeholder={t("filter")} onChange={e => setKeyword(e.target.value)} />
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu>
                <TreeProvider defaultExpandedIds={[]} selectedIds={selectedIds} onSelectionChange={setSelectedIds} multiSelect>
                  <TreeView className="px-1 py-2">
                    {filteredDataset.map(item => (
                      <RenderTreeItem
                        key={item.id}
                        item={item}
                        reload={load}
                        onEditGroup={group => setEditGroup({ open: true, data: group })}
                        onEditConnection={connection => setEditConnection({ open: true, data: connection })}
                      />
                    ))}
                  </TreeView>
                </TreeProvider>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      {editGroup.open && editGroup.data && (
        <GroupUpdateDialog open={editGroup.open} group={editGroup.data} reload={load} setOpen={open => setEditGroup({ open })} />
      )}
      {editConnection.open && editConnection.data && (
        <ConnectionUpdateDialog open={editConnection.open} connection={editConnection.data} reload={load} setOpen={open => setEditConnection({ open })} />
      )}
    </>
  )
}

type RenderTreeItemProps = {
  item: TreeItem
  reload: () => void
  onEditGroup: (group: any) => void
  onEditConnection: (connection: any) => void
}

function RenderTreeItem({ item, reload, onEditGroup, onEditConnection }: RenderTreeItemProps) {
  const { connect } = useAppContext()

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
      <TreeNodeTrigger className="group/item px-1 py-1.5">
        <TreeExpander hasChildren={item.isGroup} />
        <TreeIcon hasChildren={item.isGroup} />
        <TreeLabel>{item.name}</TreeLabel>
        <ActionButton item={item} reload={reload} onEditGroup={onEditGroup} onEditConnection={onEditConnection} />
      </TreeNodeTrigger>

      {item.isGroup && item.children && (
        <TreeNodeContent hasChildren>
          {item.children.map(child => (
            <RenderTreeItem key={child.id} item={child} reload={reload} onEditGroup={onEditGroup} onEditConnection={onEditConnection} />
          ))}
        </TreeNodeContent>
      )}
    </TreeNode>
  )
}

type ActionButtonProps = {
  item: TreeItem
  reload: () => void
  onEditGroup: (group: any) => void
  onEditConnection: (connection: any) => void
}

const ActionButton = memo(function ActionButton({ item, reload, onEditGroup, onEditConnection }: ActionButtonProps) {
  const { t } = useTranslation()
  const { connect, disconnect } = useAppContext()
  const confirm = useConfirm()

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

      const sql = item.isGroup ? `DELETE FROM "group" WHERE id = "${item.id}"` : `DELETE FROM "connection" WHERE id = "${item.id}"`
      await scorix.invoke("ext:gorm:Query", sql)
      toast.success("Deleted!")
      reload()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.error(msg)
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
                onEditConnection(item.connection)
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
              onEditGroup(item.group)
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
