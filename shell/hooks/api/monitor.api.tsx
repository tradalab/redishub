"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { monitor } from "@/api"
import type { ServerStream } from "@/lib/scorix"
import type { MonitorFrame } from "@/types"

export function useMonitorStatus(connectionId: string | undefined, databaseIdx: number) {
  return useQuery({
    queryKey: ["monitor-status", connectionId, databaseIdx],
    queryFn: () => monitor.status({ connection_id: connectionId!, database_index: databaseIdx }),
    enabled: !!connectionId,
  })
}

export function useMonitorSession(
  connectionId: string,
  databaseIdx: number,
  onMessage: (line: string) => void,
) {
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const streamRef = useRef<ServerStream<MonitorFrame> | null>(null)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const stop = useCallback(() => {
    streamRef.current?.cancel()
    streamRef.current = null
    setActive(false)
  }, [])

  const start = useCallback(async () => {
    if (streamRef.current) return
    setLoading(true)
    const stream = monitor.start({ connection_id: connectionId, database_index: databaseIdx })
    streamRef.current = stream
    setLoading(false)
    try {
      for await (const f of stream) {
        if (f.kind === "status") setActive(!!f.active)
        else if (f.kind === "message") onMessageRef.current(f.line)
      }
    } catch (err) {
      console.error("Monitor stream error:", err)
    } finally {
      if (streamRef.current === stream) streamRef.current = null
      setActive(false)
    }
  }, [connectionId, databaseIdx])

  useEffect(
    () => () => {
      streamRef.current?.cancel()
      streamRef.current = null
    },
    [],
  )

  return { active, loading, start, stop }
}
