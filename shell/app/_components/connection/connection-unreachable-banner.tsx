"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { RefreshCcwIcon } from "lucide-react"
import { Button, Spinner, toast } from "@tradalab/lyra/ui"
import { client } from "@/api"
import { useConnectionState } from "@/stores/connection-state.store"

export function ConnectionUnreachableBanner({ connectionId }: { connectionId: string }) {
  const { t } = useTranslation()
  const state = useConnectionState(connectionId)
  const [probing, setProbing] = useState(false)
  if (state?.state !== "unreachable") return null

  const retry = async () => {
    setProbing(true)
    try {
      await client.probe({ connection_id: connectionId })
    } catch (e) {
      toast.add({ title: e instanceof Error ? e.message : t("unknown_error"), type: "error" })
    } finally {
      setProbing(false)
    }
  }

  return (
    <div role="alert" className="border-destructive/20 bg-destructive/5 flex items-center gap-2 border-b px-3 py-1.5 text-xs">
      <span className="size-1.5 shrink-0 rounded-full bg-red-500" />
      <span className="shrink-0 font-medium">{t("conn_unreachable_hint")}</span>
      <span className="text-muted-foreground truncate font-mono" title={state.error}>
        {state.error}
      </span>
      <Button size="sm" variant="ghost" className="ml-auto h-6 shrink-0 px-2 text-xs" disabled={probing} onClick={retry}>
        {probing ? <Spinner /> : <RefreshCcwIcon />}
        {t("reconnect")}
      </Button>
    </div>
  )
}
