"use client"

import { toast } from "sonner"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import scorix from "@/lib/scorix"
import { Spinner } from "@/components/ui/spinner"

function formatDuration(us: number | string | undefined): string {
  if (!us) return "-"
  const micro = typeof us === "string" ? parseFloat(us) : us
  if (isNaN(micro)) return us as string
  const ms = micro / 1_000_000
  return ms < 1 ? "<1 ms" : `${ms.toFixed(2)} ms`
}

export function ConnectionDetailTabSlowQuery({ connectionId, databaseIdx }: { connectionId: string; databaseIdx: number }) {
  const { t } = useTranslation()
  const [logs, setLogs] = useState<any[] | undefined>()
  const [loading, setLoading] = useState<boolean>(false)

  const get = async (id: string) => {
    if (!id) return
    setLoading(true)
    try {
      const { logs } = await scorix.invoke<{ logs: any[] }>("client:get-slow-query", {
        connection_id: id,
        database_index: databaseIdx,
      })
      setLogs(logs)
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    get(connectionId)
  }, [connectionId])

  if (loading) {
    return (
      <div className="h-full w-full flex justify-center items-center">
        <Spinner />
      </div>
    )
  }

  if (!logs || logs.length === 0) {
    return <div className="h-full w-full flex justify-center items-center text-muted-foreground">No slow queries</div>
  }

  return (
    <div className="h-full flex flex-col overflow-auto rounded-md border">
      <div className="grid grid-cols-[200px_200px_100px_1fr] bg-muted/20 dark:bg-muted/50 font-semibold gap-2 p-2 sticky top-0 z-10 border-b">
        <div>Time</div>
        <div>Client Addr</div>
        <div>Duration</div>
        <div>Command</div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="flex flex-col">
          {logs.map((log, idx) => {
            const duration = formatDuration(log?.Duration)
            return (
              <div
                key={idx}
                className="grid grid-cols-[200px_200px_100px_1fr] items-center gap-2 p-2 border-b border-border transition-colors hover:bg-muted/50 dark:hover:bg-muted/70"
              >
                <div className="truncate">{log?.Time}</div>
                <div className="truncate">{log?.ClientAddr}</div>
                <div className="truncate">{duration}</div>
                <div className="truncate" title={log?.Args?.join?.("\n")}>
                  {log?.Args?.join?.(" ")}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
