"use client"

import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "@tradalab/lyra/ui"
import { cn } from "@/lib/utils"
import { useConnectionState } from "@/stores/connection-state.store"

const TONE: Record<string, string> = {
  connecting: "bg-amber-500 animate-pulse",
  connected: "bg-emerald-500",
  unreachable: "bg-red-500",
}

export function ConnectionStateDot({ connectionId, className }: { connectionId: string; className?: string }) {
  const { t } = useTranslation()
  const state = useConnectionState(connectionId)
  const tone = state && TONE[state.state]
  if (!state || !tone) return null

  const label =
    state.state === "connected"
      ? `${t("conn_connected")} · ${state.latency_ms < 1 ? "<1" : state.latency_ms} ms`
      : state.state === "unreachable"
        ? `${t("conn_unreachable")}: ${state.error}`
        : t("conn_connecting")

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span role="img" aria-label={label} className={cn("inline-block size-1.5 shrink-0 rounded-full", tone, className)} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
