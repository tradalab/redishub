"use client"

import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInput, SidebarMenu } from "@/components/ui/sidebar"
import { GroupAddDialog } from "@/components/app/group-add-dialog"
import { FolderPlusIcon, MoreHorizontal, PlugIcon, PlusIcon, RefreshCcwIcon, ServerIcon, SettingsIcon, Trash2Icon, UnplugIcon } from "lucide-react"
import { DatabaseAddDialog } from "@/components/app/database-add-dialog"
import { filterTree, sortTree, TreeItem } from "@/components/app/tree"
import scorix from "@/lib/scorix"
import { toast } from "sonner"
import { useEffect, useMemo, useState } from "react"
import { TreeExpander, TreeIcon, TreeLabel, TreeNode, TreeNodeContent, TreeNodeTrigger, TreeProvider, TreeView } from "@/components/ui/kibo-ui/tree"
import { useAppContext } from "@/ctx/app"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { GroupUpdateDialog } from "@/components/app/group-update-dialog"
import { DatabaseUpdateDialog } from "@/components/app/database-update-dialog"
import { useDbStore } from "@/stores/db.store"
import { buildDbTree } from "@/lib/utils"

export function SidebarDatabase() {
  const [keyword, setKeyword] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [expandedIds] = useState<string[]>([])
  const { groups, databases, load } = useDbStore()

  const dataset = useMemo(() => sortTree(buildDbTree(groups, databases)), [groups, databases])
  const filteredDataset = useMemo(() => filterTree(dataset, keyword), [dataset, keyword])

  useEffect(() => {
    load()
  }, [])

  return (
    <Sidebar variant="sidebar" collapsible="none" className="flex flex-1 w-[calc(var(--sidebar-width)-var(--sidebar-width-icon)-2px)]!">
      <SidebarHeader className="gap-2 border-b p-2">
        <div className="flex w-full items-center justify-between">
          <div className="text-foreground text-base font-medium">Databases</div>
          <div className="flex gap-2">
            <RefreshCcwIcon className="h-4 w-4 cursor-pointer" onClick={() => load()} />
            <GroupAddDialog>
              <FolderPlusIcon className="h-4 w-4 cursor-pointer" />
            </GroupAddDialog>
            <DatabaseAddDialog>
              <PlusIcon className="h-4 w-4 cursor-pointer" />
            </DatabaseAddDialog>
          </div>
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
                    <RenderTreeItem key={index} item={item} reload={load} />
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

function RenderTreeItem({ item, reload }: { item: TreeItem; reload: () => void }) {
  if (!item.isGroup) {
    return (
      <TreeNode nodeId={item.id} isLast={item.level == 0} level={item.level}>
        <TreeNodeTrigger className="cursor-default px-1 py-1.5 group/item">
          <TreeExpander />
          <TreeIcon icon={<ServerIcon />} />
          <TreeLabel>{item.name}</TreeLabel>
          <ActionButton item={item} reload={reload} />
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
        <ActionButton item={item} reload={reload} />
      </TreeNodeTrigger>
      <TreeNodeContent hasChildren>
        {item.children?.map((item, index) => (
          <RenderTreeItem key={index} item={item} reload={reload} />
        ))}
      </TreeNodeContent>
    </TreeNode>
  )
}

const ActionButton = ({ item, reload }: { item: TreeItem; reload: () => void }) => {
  const [openEditGroup, setOpenEditGroup] = useState<boolean>(false)
  const [openEditDatabase, setOpenEditDatabase] = useState<boolean>(false)
  const { connect, disconnect } = useAppContext()

  const deleteItem = async (item: TreeItem) => {
    try {
      const sql = item.isGroup ? `DELETE FROM "group" WHERE id = "${item.id}"` : `DELETE FROM "database" WHERE id = "${item.id}"`
      await scorix.invoke("ext:gorm:Query", sql)
      toast.success("Deleted!")
      reload()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"
      toast.error(msg)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="cursor-pointer ml-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
            <MoreHorizontal className="h-4 w-4" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="min-w-56 rounded-lg">
          {!item.isGroup && item.database && (
            <>
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={async e => {
                  e.stopPropagation()
                  await connect(item.database, item.database?.last_db || 0)
                }}
              >
                <PlugIcon className="h-4 w-4" />
                Connect
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={async e => {
                  e.stopPropagation()
                  await disconnect(item.database)
                }}
              >
                <UnplugIcon className="h-4 w-4" />
                Disconnect
              </DropdownMenuItem>
            </>
          )}
          {item.isGroup && item.group && (
            <DropdownMenuItem
              className="gap-2 cursor-pointer"
              onClick={e => {
                e.stopPropagation()
                setOpenEditGroup(true)
              }}
            >
              <SettingsIcon className="h-4 w-4" />
              Setting
            </DropdownMenuItem>
          )}
          {!item.isGroup && item.database && (
            <DropdownMenuItem
              className="gap-2 cursor-pointer"
              onClick={e => {
                e.stopPropagation()
                setOpenEditDatabase(true)
              }}
            >
              <SettingsIcon className="h-4 w-4" />
              Setting
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
            onClick={async e => {
              e.stopPropagation()
              await deleteItem(item)
            }}
          >
            <Trash2Icon className="h-4 w-4 text-red-600" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {item.isGroup && item.group && <GroupUpdateDialog group={item.group} reload={reload} open={openEditGroup} setOpen={setOpenEditGroup} />}
      {!item.isGroup && item.database && (
        <DatabaseUpdateDialog database={item.database} reload={reload} open={openEditDatabase} setOpen={setOpenEditDatabase} />
      )}
    </>
  )
}
