"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import scorix from "@/lib/scorix"
import { monitor } from "@/api"

export function useMonitorStart() {
  return useMutation({ mutationFn: monitor.start })
}

export function useMonitorStop() {
  return useMutation({ mutationFn: monitor.stop })
}

export function useMonitorStatus(connectionId: string | undefined, databaseIdx: number) {
  return useQuery({
    queryKey: ["monitor-status", connectionId, databaseIdx],
    queryFn: () => monitor.status({ connection_id: connectionId!, database_index: databaseIdx }),
    enabled: !!connectionId,
  })
}

export function useMonitorEvents(
  connectionId: string,
  handlers: {
    onMessage?: (payload: any) => void
    onStatus?: (active: boolean) => void
  }
) {
  const { onMessage, onStatus } = handlers
  useEffect(() => {
    if (!connectionId) return
    const offMsg = onMessage
      ? scorix.on(`monitor:message:${connectionId}`, (payload: any, error: string) => {
          if (error) {
            console.error("Monitor IPC Error:", error)
            return
          }
          onMessage(payload)
        })
      : undefined
    const offStatus = onStatus
      ? scorix.on(`monitor:status:${connectionId}`, (active: any) => onStatus(!!active))
      : undefined
    return () => {
      if (offMsg) Promise.resolve(offMsg).then(off => typeof off === "function" && off())
      if (offStatus) Promise.resolve(offStatus).then(off => typeof off === "function" && off())
    }
  }, [connectionId, onMessage, onStatus])
}

// Convenience hook: subscribe + return isMonitoring reactive value
export function useMonitorActive(connectionId: string | undefined, databaseIdx: number) {
  const [active, setActive] = useState(false)
  const status = useMonitorStatus(connectionId, databaseIdx)
  useEffect(() => {
    if (status.data) setActive(!!status.data.active)
  }, [status.data])
  useMonitorEvents(connectionId ?? "", { onStatus: setActive })
  return active
}
