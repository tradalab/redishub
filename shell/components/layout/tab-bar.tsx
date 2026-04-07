"use client"

import React, { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { X, Database, Key, Terminal, Activity, ChevronDown, Pin, PinOff, ListX, Trash2, Radio, LayoutGrid, Network } from "lucide-react"
import { useTabStore, TabType } from "@/stores/tab.store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu"

const IconMap: Record<TabType, React.ElementType> = {
  general: Database,
  "key-detail": Key,
  console: Terminal,
  "slow-query": Activity,
  pubsub: Radio,
  "key-list": LayoutGrid,
}

export function TabBar() {
  const { t } = useTranslation()
  const { tabs, activeTabId, setActiveTabId, removeTab, togglePin, closeOthers, closeAll } = useTabStore()
  const activeTabRef = useRef<HTMLDivElement>(null)

  // Scroll active tab into view when it changes
  useEffect(() => {
    if (activeTabId && activeTabRef.current) {
      activeTabRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" })
    }
  }, [activeTabId])

  // Map vertical wheel scroll to horizontal scroll
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Only handle if scrolling vertically
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      const viewport = e.currentTarget.querySelector('[data-slot="scroll-area-viewport"]')
      if (viewport) {
        viewport.scrollLeft += e.deltaY * 0.5 // Adjust scrolling speed
      }
    }
  }

  if (tabs.length === 0) {
    return null
  }

  return (
    <div className="flex items-center border-b bg-muted/30 h-11 shrink-0 overflow-hidden w-full group/tabbar">
      {/* Scroll container */}
      <ScrollArea type="hover" className="flex-1 min-w-0 overflow-hidden [&_[data-orientation=vertical]]:hidden" onWheel={handleWheel}>
        <div className="flex h-11 items-center gap-0 w-max">
          {tabs.map(tab => {
            const Icon = IconMap[tab.type] || Database
            const isActive = activeTabId === tab.id

            return (
              <ContextMenu key={tab.id}>
                <ContextMenuTrigger asChild>
                  <div
                    ref={isActive ? activeTabRef : null}
                    onClick={() => setActiveTabId(tab.id)}
                    title={tab.title}
                    className={cn(
                      "group relative flex items-center h-11 min-w-[140px] max-w-[240px] px-3 gap-2 border-r cursor-pointer transition-colors select-none shrink-0",
                      isActive
                        ? "bg-background border-t-2 border-t-primary"
                        : "bg-transparent border-t-2 border-t-transparent text-muted-foreground hover:bg-muted/50",
                      tab.pinned && "min-w-[100px] bg-primary/5"
                    )}
                  >
                    <div className="relative shrink-0">
                      <Icon className={cn("size-3.5", isActive ? "text-primary" : "")} />
                      {tab.pinned && (
                        <div className="absolute -top-1.5 -right-1.5 bg-background rounded-full p-0.5 shadow-sm">
                          <Pin className="size-2 text-primary fill-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col items-start overflow-hidden justify-center py-1">
                      <span className={cn("text-xs truncate w-full leading-tight", isActive ? "font-medium text-foreground" : "")}>{tab.title}</span>
                      <span className="text-[10px] text-muted-foreground/70 truncate w-full leading-none mt-0.5">
                        {tab.connectionName ? `${tab.connectionName} (DB${tab.databaseIdx})` : `DB${tab.databaseIdx}`}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t("close")}
                      className={cn(
                        "size-5 shrink-0 rounded-md hover:bg-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity",
                        isActive && "opacity-100"
                      )}
                      onClick={e => {
                        e.stopPropagation()
                        removeTab(tab.id)
                      }}
                    >
                      <X className="size-3" />
                    </Button>

                    {/* Active indicator line at bottom to override the wrapper's border-b smoothly */}
                    {isActive && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-background z-10" />}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem onClick={() => togglePin(tab.id)}>
                    {tab.pinned ? (
                      <>
                        <PinOff className="mr-2 size-4" />
                        <span>{t("unpin_tab")}</span>
                      </>
                    ) : (
                      <>
                        <Pin className="mr-2 size-4" />
                        <span>{t("pin_tab")}</span>
                      </>
                    )}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => removeTab(tab.id)}>
                    <X className="mr-2 size-4" />
                    <span>{t("close")}</span>
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => closeOthers(tab.id)}>
                    <ListX className="mr-2 size-4" />
                    <span>{t("close_others")}</span>
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => closeAll()}>
                    <Trash2 className="mr-2 size-4" />
                    <span>{t("close_all")}</span>
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5 hover:h-2 z-20" />
      </ScrollArea>

      {/* Tab Overflow Dropdown */}
      <div className="shrink-0 flex items-center px-1 border-l bg-muted/30 h-11">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 rounded-sm shrink-0">
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[260px] max-h-[400px] overflow-y-auto">
            {tabs.map(tab => {
              const Icon = IconMap[tab.type] || Database
              return (
                <DropdownMenuItem
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  title={tab.title}
                  className={cn("gap-2 cursor-pointer py-2", activeTabId === tab.id && "bg-accent")}
                >
                  <div className="relative shrink-0">
                    <Icon className="size-4 text-muted-foreground" />
                    {tab.pinned && <Pin className="absolute -top-1 -right-1 size-2 text-primary fill-primary" />}
                  </div>
                  <div className="flex-1 flex flex-col items-start overflow-hidden leading-tight">
                    <div className="flex items-center gap-1 w-full">
                      <span className="truncate flex-1 text-sm">{tab.title}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate w-full">
                      {tab.connectionName ? `${tab.connectionName} (DB${tab.databaseIdx})` : `DB${tab.databaseIdx}`}
                    </span>
                  </div>
                  <X
                    className="size-4 shrink-0 hover:text-red-500 hover:bg-red-50 rounded-sm p-0.5"
                    onClick={e => {
                      e.stopPropagation()
                      removeTab(tab.id)
                    }}
                  />
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
