"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { UnplugIcon } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, SidebarMenuButton, SidebarMenuItem } from "@tradalab/lyra/ui"
import { useAppContext } from "@/ctx/app.context"
import { useConnectionList } from "@/hooks/api/connection.api"
import { useGroupList } from "@/hooks/api/group.api"
import { resolveColor } from "@/lib/connection-color"
import { pickConnectionTab, useTabStore } from "@/stores/tab.store"
import { ConnectionModeIcon } from "@/app/_components/connection/connection-icon"
import { ConnectionStateDot } from "@/app/_components/connection/connection-state-dot"

export function SidebarOpenConnection({ connectionId }: { connectionId: string }) {
  const { t } = useTranslation()
  const { selectedTab, setSelectedTab, selectedDb, disconnect } = useAppContext()
  const { data: connections = [] } = useConnectionList()
  const { data: groups = [] } = useGroupList()
  const [menuOpen, setMenuOpen] = useState(false)
  const conn = connections.find(c => c.id === connectionId)
  const name = conn?.name || connectionId
  const where = conn?.host ? `${conn.host}:${conn.port}` : conn?.addrs?.split("\n")[0]

  const open = () => {
    const tab = pickConnectionTab(useTabStore.getState(), connectionId)
    if (tab) useTabStore.getState().setActiveTabId(tab.id)
    setSelectedTab("/browser")
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={{ children: where ? `${name} · ${where}` : name, hidden: false }}
        onClick={open}
        onContextMenu={e => {
          e.preventDefault()
          setMenuOpen(true)
        }}
        isActive={selectedTab === "/browser" && selectedDb === connectionId}
        className="relative px-2.5 md:px-2"
      >
        <ConnectionModeIcon mode={conn?.mode} color={resolveColor(conn, groups)} />
        <span className="truncate">{name}</span>
        <ConnectionStateDot connectionId={connectionId} className="absolute top-1 right-1 ring-2 ring-sidebar" />
      </SidebarMenuButton>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuItem onClick={() => disconnect(conn)} disabled={!conn}>
            <UnplugIcon />
            {t("disconnect")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}
