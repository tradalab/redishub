"use client"

import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { toast } from "@tradalab/lyra/ui"
import { transfer } from "@/api"
import type { ServerStream } from "@/lib/scorix"
import { formatFileSize } from "@/lib/utils"
import { downloadBlob, fromBase64, toBase64 } from "@/lib/export-file"
import { isWebMode } from "@/lib/mode"
import type { TransferExportReq, TransferImportReq, TransferProgressEvent } from "@/types"

export type ExportScope = Pick<TransferExportReq, "keys" | "prefix" | "filters" | "match_all" | "key_type">
export type ExportFormat = "ndjson" | "msgpack"

const UPLOAD_CHUNK = 1 << 20

type Phase = "export" | "import"

// Resolves to the final frame, or undefined when the user cancelled or the call failed.
async function track(
  stream: ServerStream<TransferProgressEvent>,
  phase: Phase,
  t: TFunction,
  showAtStart: boolean,
  onFrame?: (ev: TransferProgressEvent) => void
) {
  let id: string | undefined
  const show = (ev?: TransferProgressEvent) => {
    id = toast.add({
      id,
      title: t(`${phase}_running`, { n: ev?.keys ?? 0 }),
      description: formatFileSize(ev?.bytes ?? 0),
      type: "loading",
      actionProps: { children: t("cancel"), onClick: () => stream.cancel() },
    })
  }
  if (showAtStart) show()

  let last: TransferProgressEvent | undefined
  try {
    for await (const ev of stream) {
      last = ev
      if (!ev.path) return undefined
      onFrame?.(ev)
      if (!ev.done) show(ev)
    }
  } catch (e) {
    toast.add({ id, title: e instanceof Error ? e.message : t("unknown_error"), type: "error", actionProps: undefined })
    return undefined
  }
  // cancel() ends the stream quietly, so a missing done frame is the only sign of it.
  if (!last?.done) {
    toast.add({ id, title: t(`${phase}_canceled`), type: "info", actionProps: undefined })
    return undefined
  }
  const notes = [phase === "export" ? last.path : "", last.skipped ? t("export_skipped", { n: last.skipped }) : "", ...(last.errors ?? [])].filter(Boolean)
  toast.add({
    id,
    title: t(`${phase}_done`, { n: last.keys, size: formatFileSize(last.bytes) }),
    description: notes.join("\n"),
    type: "success",
    actionProps: undefined,
  })
  return last
}

export function useExportKeys(connectionId: string, databaseIdx: number, connectionName?: string) {
  const { t } = useTranslation()

  return useCallback(
    async (scope: Partial<ExportScope>, format: ExportFormat) => {
      const stream = transfer.export({
        connection_id: connectionId,
        database_index: databaseIdx,
        keys: scope.keys ?? [],
        prefix: scope.prefix ?? "",
        filters: scope.filters ?? [],
        match_all: scope.match_all ?? false,
        key_type: scope.key_type ?? "",
        file_name: `${(connectionName || "redis").replace(/[^\w.-]+/g, "_")}-db${databaseIdx}`,
        format,
      })
      // Web mode has no save dialog on the server, which streams the file here instead.
      const parts: Uint8Array<ArrayBuffer>[] = []
      const last = await track(stream, "export", t, false, ev => ev.chunk && parts.push(fromBase64(ev.chunk)))
      if (last && isWebMode()) downloadBlob(last.path, new Blob(parts))
    },
    [connectionId, databaseIdx, connectionName, t]
  )
}

export function useImportKeys(connectionId: string, databaseIdx: number) {
  const { t } = useTranslation()

  const inspect = useCallback(
    (upload = "") => transfer.inspect({ connection_id: connectionId, database_index: databaseIdx, upload }),
    [connectionId, databaseIdx]
  )

  // Web mode: the browser picks the file and sends it up, since the server has no dialog to open.
  const upload = useCallback(
    async (file: File) => {
      const id = toast.add({ title: t("import_uploading", { pct: 0 }), type: "loading" })
      try {
        let token = ""
        for (let off = 0; off === 0 || off < file.size; off += UPLOAD_CHUNK) {
          const chunk = new Uint8Array(await file.slice(off, off + UPLOAD_CHUNK).arrayBuffer())
          token = (await transfer.upload({ upload: token, data: toBase64(chunk) })).upload
          const pct = file.size ? Math.round((Math.min(file.size, off + UPLOAD_CHUNK) / file.size) * 100) : 100
          toast.add({ id, title: t("import_uploading", { pct }), type: "loading" })
        }
        toast.close(id)
        return token
      } catch (e) {
        toast.add({ id, title: e instanceof Error ? e.message : t("unknown_error"), type: "error" })
        return ""
      }
    },
    [t]
  )

  const run = useCallback(
    (opts: Pick<TransferImportReq, "token" | "overwrite" | "keep_ttl">) =>
      track(transfer.import({ connection_id: connectionId, database_index: databaseIdx, ...opts }), "import", t, true),
    [connectionId, databaseIdx, t]
  )

  return { inspect, upload, run }
}
