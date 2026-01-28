"use client"

import { ReactNode, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type PanelItemType = {
  key: string
  label: string
  danger?: boolean
  content: ReactNode
}

export function Panel({ items, enable_url }: { items: PanelItemType[]; enable_url?: boolean }) {
  const router = useRouter()
  const params = useSearchParams()

  const defaultKey = items[0].key

  // get panel from url
  const panelFromUrl = useMemo(() => {
    if (!enable_url) return defaultKey
    return params.get("panel") ?? defaultKey
  }, [enable_url, params, defaultKey])

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
    router.replace(`?panel=${key}`, { scroll: false })
  }

  return (
    <div className="space-y-6">
      {/* Mobi */}
      <div className="lg:hidden">
        <div className="inline-flex rounded-lg bg-muted p-1">
          {items.map(s => (
            <button
              key={s.key}
              onClick={() => navigate(s.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-all",
                active === s.key ? "bg-background text-foreground shadow-sm" : s.danger ? "text-destructive" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside className="hidden space-y-1 lg:block">
          {items.map(s => (
            <PanelItem key={s.key} active={active === s.key} danger={s.danger} onClick={() => navigate(s.key)}>
              {s.label}
            </PanelItem>
          ))}
        </aside>
        {/* Content */}
        <div className="space-y-6">{current.content}</div>
      </div>
    </div>
  )
}

function PanelItem({ children, active, danger, onClick }: { children: ReactNode; active?: boolean; danger?: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-md px-3 py-2 text-sm transition-colors",
        active ? "bg-muted font-medium" : danger ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:bg-muted"
      )}
    >
      {children}
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
