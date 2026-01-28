"use client"

import { toast } from "sonner"
import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import scorix from "@/lib/scorix"
import { useTranslation } from "react-i18next"

export function ConnectionDetailTabSlowQuery({ connectionId, databaseIdx }: { connectionId: string; databaseIdx: number }) {
  const { t } = useTranslation()
  const [logs, setLogs] = useState<any | undefined>()

  const get = async (id: string) => {
    if (!id) {
      return
    }
    try {
      const { logs } = await scorix.invoke<{ logs: any[] }>("client:get-slow-query", { connection_id: id, database_index: databaseIdx })
      setLogs(logs)
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.error(msg)
    }
  }

  useEffect(() => {
    get(connectionId)
  }, [connectionId])

  if (!logs) {
    return null
  }

  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <Table className="flex-1 min-h-0 overflow-auto rounded-md border">
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/5">ID</TableHead>
            <TableHead className="w-1/5">Duration</TableHead>
            <TableHead className="w-1/5">ClientAddr</TableHead>
            <TableHead className="w-1/5">Time</TableHead>
            <TableHead className="w-1/5">Args</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log: any, idx: number) => (
            <TableRow key={idx}>
              <TableCell>{log?.ID}</TableCell>
              <TableCell>{log?.Duration}</TableCell>
              <TableCell>{log?.ClientAddr}</TableCell>
              <TableCell>{log?.Time}</TableCell>
              <TableCell>{log?.Args?.join?.(" ")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
