"use client"

import { useCallback, useState, memo } from "react"
import { useTranslation } from "react-i18next"

import { SidebarHeader, SidebarInput, toast } from "@tradalab/lyra/ui"
import { SidebarPanel } from "@tradalab/lyra/shell"
import { EditIcon, FolderPlusIcon, LockIcon, MoreHorizontal, PlugIcon, PlusIcon, RefreshCcwIcon, Trash2Icon, UnplugIcon } from "lucide-react"
import { ConnectionTree, useConfirm, type ConnectionTreeItem, type DropPlan } from "@tradalab/lyra/blocks"
import { useAppContext } from "@/ctx/app.context"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@tradalab/lyra/ui"
import { useConnection } from "@/app/_components/connection/connection.context"
import { ConnectionReq as ConnectionDO, GroupItem as GroupDO } from "@/types"
import { useDeleteGroup, useGroupList, useReorderGroups } from "@/hooks/api/group.api"
import { useConnectionList, useDeleteConnection, useReorderConnections } from "@/hooks/api/connection.api"
import { useGroup } from "@/app/_components/group/group.context"
import { useTabStore } from "@/stores/tab.store"
import { ConnectionStateDot, GroupStateSummary } from "@/app/_components/connection/connection-state-dot"
import { connectionMatches } from "@/lib/connection-tree"
import { ConnectionModeIcon } from "@/app/_components/connection/connection-icon"
import { CONNECTION_COLORS, isConnectionColor, resolveColor } from "@tradalab/lyra/utils"

type Item = ConnectionTreeItem<GroupDO, ConnectionDO>

const EXPANDED_KEY = "redishub:sidebar:expanded"

export function SidebarConnection() {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState("")
  const { create: connectionCreate } = useConnection()
  const { create: groupCreate } = useGroup()
  const { connect, selectedDb } = useAppContext()

  const { data: groups = [], refetch: groupsRefetch } = useGroupList()
  const { data: databases = [], refetch: databasesRefetch } = useConnectionList()

  const refetch = () => {
    groupsRefetch()
    databasesRefetch()
  }

  const reorderGroups = useReorderGroups()
  const reorderConnections = useReorderConnections()
  const onDrop = useCallback(
    async (plan: DropPlan) => {
      try {
        if (plan.kind === "group") {
          await reorderGroups.mutateAsync(plan.ids)
        } else {
          await reorderConnections.mutateAsync({ groupId: plan.groupId, ids: plan.ids })
        }
      } catch (e: any) {
        const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
        toast.add({ title: msg, type: "error" })
      }
    },
    [reorderGroups, reorderConnections, t]
  )

  const matches = useCallback((item: Item, k: string) => connectionMatches(item.connection, item.name, k), [])
  const iconClassName = useCallback(
    (item: Item) => {
      const color = item.isGroup ? (isConnectionColor(item.group?.color) ? item.group?.color : undefined) : resolveColor(item.connection, groups)
      return color && CONNECTION_COLORS[color].tint
    },
    [groups]
  )

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

        <ConnectionTree
          groups={groups}
          connections={databases}
          keyword={keyword}
          matches={matches}
          storageKey={EXPANDED_KEY}
          activeId={selectedDb}
          onOpen={c => connect(c, c.last_db || 0)}
          onDrop={onDrop}
          icon={item => <ConnectionModeIcon mode={item.connection?.mode} />}
          iconClassName={iconClassName}
          badges={(item, memberIds) => <Badges item={item} memberIds={memberIds} />}
          actions={item => <ActionButton item={item} reload={refetch} />}
        />
      </SidebarPanel>
    </>
  )
}

function Badges({ item, memberIds }: { item: Item; memberIds: readonly string[] }) {
  const { t } = useTranslation()
  if (item.isGroup) return <GroupStateSummary connectionIds={[...memberIds]} className="ml-1.5" />
  return (
    <>
      <ConnectionStateDot connectionId={item.id} className="ml-1.5" />
      {item.connection?.read_only && (
        <span title={t("read_only")} className="ml-auto mr-0.5 inline-flex shrink-0">
          <LockIcon className="h-3 w-3 text-amber-600 dark:text-amber-400" />
        </span>
      )}
    </>
  )
}

type ActionButtonProps = {
  item: Item
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
        <div className="cursor-pointer">
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
