"use client"

import { ReactNode, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LucideIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type PanelItemType = {
  key: string
  label: string
  icon?: LucideIcon
  danger?: boolean
  hasError?: boolean
  content: ReactNode
}

export function Panel({ name, items, enable_url }: { name?: string; items: PanelItemType[]; enable_url?: boolean }) {
  const router = useRouter()
  const params = useSearchParams()

  const defaultKey = items[0].key

  const panelKey = useMemo(() => `panel${name ? "-" + name : ""}`, [name])

  // get panel from url
  const panelFromUrl = useMemo(() => {
    if (!enable_url) return defaultKey
    return params.get(panelKey) ?? defaultKey
  }, [enable_url, params, defaultKey, panelKey])

  // set active
  const [active, setActive] = useState(panelFromUrl)

  // sync URL → state
  useEffect(() => {
    if (!enable_url) return
    setActive(panelFromUrl)
  }, [panelFromUrl, enable_url])

  const current = items.find(s => s.key === active) ?? items[0]

  const navigate = (key: string) => {
    if (key === active) return
    setActive(key)
    if (!enable_url) return
    router.replace(`?${panelKey}=${key}`, { scroll: false })
  }

  return (
    <div className="space-y-6 h-full min-h-0 flex flex-col">
      {/* Mobi */}
      <div className="lg:hidden">
        <div className="inline-flex rounded-lg bg-muted p-1">
          {items?.map(s => (
            <button
              key={s.key}
              onClick={() => navigate(s.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-all",
                active === s.key ? "bg-background text-foreground shadow-sm" : s.danger ? "text-destructive" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="relative flex items-center gap-2">
                {s.icon && <s.icon className="h-4 w-4" />}
                {s.label}
                {s.hasError && <span className="absolute -top-1 -right-2 flex h-2 w-2 rounded-full bg-destructive" />}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr] flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="hidden space-y-1 lg:block overflow-y-auto min-h-0 pr-1 [overflow:overlay]">
          {items?.map(s => (
            <PanelItem key={s.key} active={active === s.key} icon={s.icon} danger={s.danger} hasError={s.hasError} onClick={() => navigate(s.key)}>
              {s.label}
            </PanelItem>
          ))}
        </aside>
        {/* Content */}
        <div className="space-y-6 overflow-y-auto min-h-0 pr-1 [overflow:overlay]">{current.content}</div>
      </div>
    </div>
  )
}

export interface PanelItemProps {
  children: ReactNode
  active?: boolean
  icon?: LucideIcon
  danger?: boolean
  hasError?: boolean
  onClick?: () => void
}

function PanelItem({ children, active, icon: Icon, danger, hasError, onClick }: PanelItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-md px-3 py-2 text-sm transition-colors flex items-center justify-between",
        active ? "bg-muted font-medium" : danger ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:bg-muted"
      )}
    >
      <span className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        {children}
      </span>
      {hasError && <span className="h-2 w-2 rounded-full bg-destructive" />}
    </div>
  )
}

export interface PanelCardProps {
  title: string
  description?: string
  hint?: string
  action?: ReactNode
  children?: ReactNode
}

export function PanelCard({ title, description, hint, action, children }: PanelCardProps) {
  return (
    <Card className={cn({ "pb-3": hint || action })}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription className="max-w-2xl">{description}</CardDescription>}
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
      {(hint || action) && (
        <CardFooter className="flex items-center justify-between border-t !pt-3 !pb-0">
          <p className="text-sm text-muted-foreground">{hint}</p>
          {action}
        </CardFooter>
      )}
    </Card>
  )
}
