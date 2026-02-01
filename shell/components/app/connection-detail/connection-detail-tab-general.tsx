"use client"

import { toast } from "sonner"
import { useEffect, useState } from "react"
import { parseRedisInfo } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import scorix from "@/lib/scorix"
import { useTranslation } from "react-i18next"
import { Spinner } from "@/components/ui/spinner"

export function ConnectionDetailTabGeneral({ connectionId, databaseIdx }: { connectionId: string; databaseIdx: number }) {
  const { t } = useTranslation()
  const [info, setInfo] = useState<object | undefined>()
  const [loading, setLoading] = useState<boolean>(false)

  const general = async (id: string) => {
    if (!id) return

    setLoading(true)
    try {
      const res = await scorix.invoke<{ info: string; total_db: number }>("client:general", { connection_id: id, database_index: databaseIdx })
      setInfo(parseRedisInfo(res.info))
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    general(connectionId)
  }, [connectionId])

  if (loading) {
    return (
      <div className="h-full w-full flex justify-center items-center">
        <Spinner />
      </div>
    )
  }

  if (!info) {
    return null
  }

  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <Tabs defaultValue="Server" className="flex flex-col h-full overflow-hidden">
        <TabsList className="shrink-0">
          {Object.entries(info).map(([section]) => (
            <TabsTrigger key={section} value={section}>
              {section}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="flex-1 min-h-0 overflow-auto">
          {Object.entries(info).map(([section, group]) => (
            <TabsContent key={section} value={section} className="h-full flex flex-col overflow-auto">
              <Table className="flex-1 min-h-0 overflow-auto rounded-md border">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">Key</TableHead>
                    <TableHead className="w-2/3">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(group).map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell className="font-medium">{key}</TableCell>
                      <TableCell>{String(value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  )
}
