"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AlertTriangleIcon, UploadIcon } from "lucide-react"
import { Badge, Button, Checkbox, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Label } from "@tradalab/lyra/ui"
import type { TransferInspectRes } from "@/types"

interface BrowserImportDialogProps {
  preview: TransferInspectRes | null
  databaseIdx: number
  onClose: () => void
  onImport: (opts: { overwrite: boolean; keepTtl: boolean }) => void
}

export function BrowserImportDialog({ preview, databaseIdx, onClose, onImport }: BrowserImportDialogProps) {
  const { t } = useTranslation()
  const [overwrite, setOverwrite] = useState(false)
  const [keepTtl, setKeepTtl] = useState(true)

  const conflicts = preview?.conflicts ?? 0
  const keys = preview?.keys ?? 0
  const toWrite = overwrite ? keys : keys - conflicts

  return (
    <Dialog open={!!preview} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadIcon className="h-4 w-4" />
            {t("import_title", { db: databaseIdx })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="truncate font-mono text-xs text-muted-foreground" title={preview?.file_name}>
            {preview?.file_name}
          </div>
          <div>{t("import_keys_in_file", { n: keys })}</div>
          <div className="flex flex-wrap gap-1.5">
            {(preview?.types ?? []).map(c => (
              <Badge key={c.kind} variant="outline" className="font-normal">
                {c.kind} {c.keys}
              </Badge>
            ))}
          </div>

          {(preview?.invalid ?? 0) > 0 && (
            <div className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
              <div className="flex items-center gap-1.5 font-medium">
                <AlertTriangleIcon className="h-3.5 w-3.5" />
                {t("import_invalid", { n: preview?.invalid })}
              </div>
              {(preview?.errors ?? []).map(e => (
                <div key={e} className="truncate font-mono text-muted-foreground" title={e}>
                  {e}
                </div>
              ))}
            </div>
          )}

          {conflicts > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox id="import-overwrite" checked={overwrite} onCheckedChange={v => setOverwrite(!!v)} />
              <Label htmlFor="import-overwrite" className="font-normal">
                {t("import_overwrite", { n: conflicts })}
              </Label>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Checkbox id="import-keep-ttl" checked={keepTtl} onCheckedChange={v => setKeepTtl(!!v)} />
            <Label htmlFor="import-keep-ttl" className="font-normal">
              {t("import_keep_ttl")}
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button disabled={toWrite <= 0} onClick={() => onImport({ overwrite, keepTtl })}>
            {t("import_run", { n: toWrite })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
