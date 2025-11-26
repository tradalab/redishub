"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { DatabaseIcon, LayersIcon, ServerIcon, SettingsIcon } from "lucide-react"
import { configs } from "@/configs"
import { SettingDialog } from "@/components/app/setting-dialog"
import { useAppContext } from "@/ctx/app.context"

export function SidebarTool() {
  const { selectedTab, setSelectedTab, selectedDb } = useAppContext()
  return (
    <Sidebar collapsible="none" className="overflow-hidden w-[calc(var(--sidebar-width-icon)+1px)]! border-r">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
              <div>
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <LayersIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{configs.app.name}</span>
                  <span className="truncate text-xs">{configs.app.desc}</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="px-1.5 md:px-0">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={{ children: "Databases", hidden: false }}
                  onClick={() => setSelectedTab("/databases")}
                  isActive={selectedTab === "/databases"}
                  className="px-2.5 md:px-2"
                >
                  <DatabaseIcon />
                  <span>Databases</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {selectedDb && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={{ children: "Browser", hidden: false }}
                    onClick={() => setSelectedTab("/browser")}
                    isActive={selectedTab === "/browser"}
                    className="px-2.5 md:px-2"
                  >
                    <ServerIcon />
                    <span>Browser</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SettingDialog>
              <SidebarMenuButton tooltip={{ children: "Settings", hidden: false }} className="px-2.5 md:px-2">
                <SettingsIcon />
                <span>Settings</span>
              </SidebarMenuButton>
            </SettingDialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
