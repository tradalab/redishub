"use client"

import { ComponentProps } from "react"
import { Sidebar } from "@/components/ui/sidebar"
import { SidebarDatabase } from "@/components/app/sidebar/sidebar-database"
import { SidebarBrowser } from "@/components/app/sidebar/sidebar-browser"
import { useAppContext } from "@/ctx/app.context"
import { SidebarTool } from "@/components/app/sidebar/sidebar-tool"

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const { selectedTab } = useAppContext()

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="overflow-hidden *:data-[sidebar=sidebar]:flex-row" {...props}>
      <SidebarTool />
      {selectedTab == "/databases" && <SidebarDatabase />}
      {selectedTab == "/browser" && <SidebarBrowser />}
    </Sidebar>
  )
}
