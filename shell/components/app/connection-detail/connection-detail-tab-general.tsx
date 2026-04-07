"use client"

import { toast } from "sonner"
import { useEffect, useState, useMemo, useCallback } from "react"
import { parseRedisInfo } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import scorix from "@/lib/scorix"
import { useTranslation } from "react-i18next"
import { Spinner } from "@/components/ui/spinner"
import { Server, Users, Zap, Save, Activity, Network, Cpu, Box, Share2, Key, Database, ChevronLeft, ChevronRight, Info, LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const SECTION_ICONS: Record<string, LucideIcon> = {
  Server,
  Clients: Users,
  Memory: Zap,
  Persistence: Save,
  Stats: Activity,
  Replication: Network,
  CPU: Cpu,
  Modules: Box,
  Cluster: Share2,
  Keyspace: Key,
}

type SummaryCardProps = {
  title: string
  value: string
  icon: LucideIcon
  colorClass: string
  extra?: React.ReactNode
}

function SummaryCard({ title, value, icon: Icon, colorClass, extra }: SummaryCardProps) {
  return (
    <Card className="shadow-none border-none bg-transparent">
      <CardContent className="p-0 flex items-center gap-3">
        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", colorClass)}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase">{title}</p>
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold tracking-tight">{value}</p>
            {extra}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ConnectionDetailTabGeneral({ connectionId, databaseIdx }: { connectionId: string; databaseIdx: number }) {
  const { t } = useTranslation()
  const [info, setInfo] = useState<Record<string, Record<string, any>> | undefined>()
  const [loading, setLoading] = useState<boolean>(false)
  const [activeSection, setActiveSection] = useState<string>("Server")
  const [collapsed, setCollapsed] = useState<boolean>(false)

  const general = useCallback(
    async (id: string) => {
      if (!id) return

      setLoading(true)
      try {
        const res = await scorix.invoke<{ info: string; total_db: number }>("client:general", { connection_id: id, database_index: databaseIdx })
        const parsedInfo = parseRedisInfo(res.info) as Record<string, Record<string, any>>
        setInfo(parsedInfo)
        if (parsedInfo && !parsedInfo[activeSection]) {
          setActiveSection(Object.keys(parsedInfo)[0] || "Server")
        }
      } catch (e: any) {
        const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
        toast.error(msg)
      } finally {
        setLoading(false)
      }
    },
    [databaseIdx, t, activeSection]
  )

  useEffect(() => {
    general(connectionId)
  }, [connectionId, general])

  const summaryMetrics = useMemo(() => {
    if (!info) return null

    const dbKey = `db${databaseIdx}`
    const dbInfo = info.Keyspace?.[dbKey] as string | undefined
    let keysCount = "0"
    if (dbInfo) {
      const match = dbInfo.match(/keys=(\d+)/)
      if (match) keysCount = match[1]
    }

    return {
      memory: info.Memory?.used_memory_human || "N/A",
      clients: info.Clients?.connected_clients || "N/A",
      version: info.Server?.redis_version || "N/A",
      uptime: info.Server?.uptime_in_days || "0",
      keys: keysCount,
    }
  }, [info, databaseIdx])

  if (loading) {
    return (
      <div className="h-full w-full flex justify-center items-center">
        <Spinner />
      </div>
    )
  }

  if (!info || !summaryMetrics) {
    return null
  }

  const sections = Object.keys(info)

  return (
    <div className="flex h-full w-full bg-background overflow-hidden relative text-sm">
      <div className={cn("flex flex-col border-r bg-muted/30 transition-all duration-300 ease-in-out shrink-0 overflow-hidden", collapsed ? "w-14" : "w-56")}>
        <div className="p-3 flex items-center justify-between">
          {!collapsed && <span className="font-semibold text-xs px-1 opacity-70 uppercase tracking-wider">Sections</span>}
          <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {sections.map(section => {
            const Icon = SECTION_ICONS[section] || Info
            const isActive = activeSection === section
            return (
              <TooltipProvider key={section} delayDuration={500}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn("w-full justify-start gap-3 px-3 h-9", isActive && "bg-secondary/70 font-medium")}
                      onClick={() => setActiveSection(section)}
                    >
                      <Icon size={16} className={cn("shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                      {!collapsed && <span className="truncate">{section}</span>}
                    </Button>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">{section}</TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 border-b bg-muted/10 shrink-0">
          <SummaryCard title={t("Memory")} value={summaryMetrics.memory} icon={Zap} colorClass="bg-blue-500/10 text-blue-500" />
          <SummaryCard title={t("Keys (DB " + databaseIdx + ")")} value={summaryMetrics.keys} icon={Database} colorClass="bg-green-500/10 text-green-500" />
          <SummaryCard title={t("Clients")} value={summaryMetrics.clients} icon={Users} colorClass="bg-amber-500/10 text-amber-500" />
          <SummaryCard
            title={t("Version")}
            value={summaryMetrics.version}
            icon={Info}
            colorClass="bg-purple-500/10 text-purple-500"
            extra={
              <Badge variant="outline" className="text-[10px] py-0 h-4 font-normal">
                {summaryMetrics.uptime}d up
              </Badge>
            }
          />
        </div>

        <div className="flex-1 overflow-auto p-0">
          <div className="flex items-center p-3 gap-2 sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b border-transparent">
            {activeSection && (
              <>
                {(() => {
                  const Icon = SECTION_ICONS[activeSection] || Info
                  return <Icon size={18} className="text-primary" />
                })()}
                <h2 className="text-base font-semibold">{activeSection}</h2>
                <Badge variant="secondary" className="ml-2 font-normal text-[10px] h-5 opacity-70">
                  {Object.keys(info[activeSection] || {}).length} Fields
                </Badge>
              </>
            )}
          </div>

          <div className="px-4 pb-4">
            <div className="rounded-lg border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/30">
                    <TableHead className="w-1/3 py-2 text-xs uppercase tracking-wider">Property</TableHead>
                    <TableHead className="w-2/3 py-2 text-xs uppercase tracking-wider">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(info[activeSection] || {}).map(([key, value]) => (
                    <TableRow key={key} className="group transition-colors">
                      <TableCell className="font-medium align-top py-2 text-muted-foreground group-hover:text-foreground">{key}</TableCell>
                      <TableCell className="font-mono text-xs py-2 break-all text-foreground/90">{String(value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
