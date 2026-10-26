"use client"

import { useTranslation } from "react-i18next"
import { DownloadIcon } from "lucide-react"
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, toast } from "@tradalab/lyra/ui"
import { saveFile, type ExportFile } from "@/lib/export-file"

export type ExportItem = { label: string; file: () => ExportFile }

export function ExportMenu({ items, disabled }: { items: ExportItem[]; disabled?: boolean }) {
  const { t } = useTranslation()

  const save = async (item: ExportItem) => {
    try {
      const path = await saveFile(item.file())
      if (path) toast.add({ title: t("export_saved"), description: path, type: "success" })
    } catch (e) {
      toast.add({ title: e instanceof Error ? e.message : t("unknown_error"), type: "error" })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-sm" variant="outline" title={t("export")} disabled={disabled}>
          <DownloadIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {items.map(item => (
          <DropdownMenuItem key={item.label} className="cursor-pointer" onClick={() => save(item)}>
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
