"use client"

import { useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import scorix from "@/lib/scorix"
import { pubsub } from "@/api"

export function usePubSubSubscribe() {
  return useMutation({ mutationFn: pubsub.subscribe })
}

export function usePubSubUnsubscribe() {
  return useMutation({ mutationFn: pubsub.unsubscribe })
}

export function usePubSubPublish() {
  return useMutation({ mutationFn: pubsub.publish })
}

export function usePubSubMessages(connectionId: string, onMessage: (payload: any) => void) {
  useEffect(() => {
    if (!connectionId) return
    const off = scorix.on(`pubsub:message:${connectionId}`, (payload: any, error: string) => {
      if (error) {
        console.error("PubSub IPC Error:", error)
        return
      }
      onMessage(payload)
    })
    return () => {
      Promise.resolve(off).then(o => typeof o === "function" && o())
    }
  }, [connectionId, onMessage])
}
