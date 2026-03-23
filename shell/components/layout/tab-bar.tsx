"use client"

import React, { useEffect, useRef } from "react"
import { X, Database, Key, Terminal, Activity, ChevronDown } from "lucide-react"
import { useTabStore, TabType } from "@/stores/tab.store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

const IconMap: Record<TabType, React.ElementType> = {
  general: Database,
  "key-detail": Key,
  console: Terminal,
  "slow-query": Activity,
}

export function TabBar() {
  const { tabs, activeTabId, setActiveTabId, removeTab } = useTabStore()
  const activeTabRef = useRef<HTMLDivElement>(null)

  // Scroll active tab into view when it changes
  useEffect(() => {
    if (activeTabRef.current) {
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
              <div
                key={tab.id}
                ref={isActive ? activeTabRef : null}
                onClick={() => setActiveTabId(tab.id)}
                title={tab.title}
                className={cn(
                  "group relative flex items-center h-11 min-w-[140px] max-w-[240px] px-3 gap-2 border-r cursor-pointer transition-colors select-none shrink-0",
                  isActive
                    ? "bg-background border-t-2 border-t-primary"
                    : "bg-transparent border-t-2 border-t-transparent text-muted-foreground hover:bg-muted/50"
                )}
              >
                <Icon className={cn("size-3.5 shrink-0", isActive ? "text-primary" : "")} />
                <div className="flex-1 min-w-0 flex flex-col items-start overflow-hidden justify-center py-1">
                  <span className={cn("text-xs truncate w-full leading-tight", isActive ? "font-medium text-foreground" : "")}>{tab.title}</span>
                  <span className="text-[10px] text-muted-foreground/70 truncate w-full leading-none mt-0.5">
                    {tab.connectionName ? `${tab.connectionName} (DB${tab.databaseIdx})` : `DB${tab.databaseIdx}`}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
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
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 flex flex-col items-start overflow-hidden leading-tight">
                    <span className="truncate w-full text-sm">{tab.title}</span>
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
