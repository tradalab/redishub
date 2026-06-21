"use client"

import { useEffect, useRef } from "react"
import { useMutation } from "@tanstack/react-query"
import { pubsub } from "@/api"
import type * as T from "@/types"

export function usePubSubSubscribe() {
  return useMutation({ mutationFn: pubsub.subscribe })
}

export function usePubSubUnsubscribe() {
  return useMutation({ mutationFn: pubsub.unsubscribe })
}

export function usePubSubPublish() {
  return useMutation({ mutationFn: pubsub.publish })
}

export function usePubSubStream(
  connectionId: string,
  databaseIdx: number,
  onMessage: (payload: T.PubsubMessageEvent) => void,
) {
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  useEffect(() => {
    if (!connectionId) return
    const stream = pubsub.stream({ connection_id: connectionId, database_index: databaseIdx })
    let cancelled = false
    ;(async () => {
      try {
        for await (const m of stream) {
          if (cancelled) break
          onMessageRef.current(m)
        }
      } catch (err) {
        if (!cancelled) console.error("PubSub stream error:", err)
      }
    })()
    return () => {
      cancelled = true
      stream.cancel()
    }
  }, [connectionId, databaseIdx])
}
