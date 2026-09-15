"use client"

import { useEffect } from "react"
import { client } from "@/api"
import { useClientStateEvent } from "@/hooks/events"
import { useConnectionStateStore } from "@/stores/connection-state.store"

export function ConnectionStateSync() {
  const apply = useConnectionStateStore(s => s.apply)
  const replace = useConnectionStateStore(s => s.replace)

  useClientStateEvent(apply)

  useEffect(() => {
    const load = () =>
      client
        .states({})
        .then(res => replace(res.items ?? []))
        .catch(console.error)
    load()

    const onBridge = (e: Event) => {
      if ((e as CustomEvent).detail === "connected") load()
    }
    window.addEventListener("scorix:connection:status", onBridge)
    return () => window.removeEventListener("scorix:connection:status", onBridge)
  }, [replace])

  return null
}
