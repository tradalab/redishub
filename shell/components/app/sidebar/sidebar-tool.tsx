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
import { BookOpenIcon, BugIcon, DatabaseIcon, GithubIcon, LayersIcon, ServerIcon, SettingsIcon } from "lucide-react"
import { configs } from "@/configs"
import { SettingDialog } from "@/components/app/setting/setting-dialog"
import { useAppContext } from "@/ctx/app.context"
import { useTranslation } from "react-i18next"
import scorix from "@/lib/scorix"

export function SidebarTool() {
  const { t } = useTranslation()
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
                  tooltip={{ children: t("connections"), hidden: false }}
                  onClick={() => setSelectedTab("/connections")}
                  isActive={selectedTab === "/connections"}
                  className="px-2.5 md:px-2"
                >
                  <DatabaseIcon />
                  <span>{t("connections")}</span>
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
                    <span>{t("browser")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {[
            { title: "Github", icon: <GithubIcon />, url: "https://github.com/tradalab/redishub" },
            { title: t("report_issues"), icon: <BugIcon />, url: "https://github.com/tradalab/redishub/issues" },
            { title: t("documentation"), icon: <BookOpenIcon />, url: "https://redishub.tradalab.com/" },
          ].map((item, i) => (
            <SidebarMenuItem key={i}>
              <SidebarMenuButton
                className="px-2.5 md:px-2"
                tooltip={{ children: item.title, hidden: false }}
                onClick={e => {
                  e.preventDefault()
                  scorix.invoke("mod:browser:OpenUrl", { url: item.url })
                }}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SettingDialog>
              <SidebarMenuButton tooltip={{ children: t("settings"), hidden: false }} className="px-2.5 md:px-2">
                <SettingsIcon />
                <span>{t("settings")}</span>
              </SidebarMenuButton>
            </SettingDialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
