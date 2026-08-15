"use client"

import { useQuery } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"
import { client } from "@/api"
import { KEYS_BASE } from "@/hooks/api/client.api"
import type { KeyFilter } from "@/types"

export type KeysSearchState = {
  keys: string[]
  /** Keys examined server-side — the denominator that makes a slow filter legible. */
  scanned: number
  /** Keys kept so far. Tracks keys.length except while a batch is in flight. */
  matched: number
  /** True while a stream is open. */
  isLoading: boolean
  /** The last run stopped on a limit or a time budget, so there is more to fetch. */
  hasMore: boolean
  error: string | null
  reload: () => void
  loadMore: () => void
  loadAll: () => void
  /** Abort the running scan and keep whatever already arrived. */
  cancel: () => void
}

type Options = {
  filters?: KeyFilter[]
  matchAll?: boolean
  keyType?: string
  /** Matches per run — one press of "load more". */
  limit?: number
}

export function useKeysSearch(connectionId: string, databaseIdx: number, opts: Options = {}): KeysSearchState {
  const { filters, matchAll = false, keyType = "", limit = 10000 } = opts

  const [keys, setKeys] = useState<string[]>([])
  const [scanned, setScanned] = useState(0)
  const [matched, setMatched] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cursorRef = useRef("0")
  const seenRef = useRef<Set<string>>(new Set())

  const streamRef = useRef<{ cancel: () => void } | null>(null)
  const runIdRef = useRef(0)

  const filtersKey = JSON.stringify(filters ?? [])

  const cancelActive = useCallback(() => {
    streamRef.current?.cancel()
    streamRef.current = null
  }, [])

  const run = useCallback(
    async (cursor: string, reset: boolean): Promise<boolean> => {
      if (!connectionId) return false

      cancelActive()
      const runId = ++runIdRef.current

      if (reset) {
        seenRef.current = new Set()
        setKeys([])
        setScanned(0)
        setMatched(0)
      }
      setError(null)
      setIsLoading(true)
      let more = false

      const stream = client.keysSearch({
        connection_id: connectionId,
        database_index: databaseIdx,
        filters: filters ?? [],
        match_all: matchAll,
        key_type: keyType,
        scan_count: 0, // server default
        limit,
        cursor,
        budget_ms: 0, // server default
      })
      streamRef.current = stream

      try {
        for await (const ev of stream) {
          if (runId !== runIdRef.current) return false

          if (ev.keys?.length) {
            const fresh = ev.keys.filter(k => !seenRef.current.has(k))
            if (fresh.length) {
              fresh.forEach(k => seenRef.current.add(k))
              setKeys(prev => [...prev, ...fresh])
            }
          }
          setScanned(Number(ev.scanned ?? 0))
          setMatched(seenRef.current.size)

          if (ev.cursor) cursorRef.current = ev.cursor

          if (ev.done) {
            more = Boolean(ev.truncated)
            setHasMore(more)
          }
        }
      } catch (e: unknown) {
        if (runId !== runIdRef.current) return false

        setError(e instanceof Error ? e.message : String(e))
        setHasMore(false)
        return false
      } finally {
        if (runId === runIdRef.current) {
          setIsLoading(false)
          streamRef.current = null
        }
      }

      return more
    },
    [connectionId, databaseIdx, filtersKey, matchAll, keyType, limit, cancelActive] // eslint-disable-line react-hooks/exhaustive-deps
  )

  useEffect(() => {
    cursorRef.current = "0"
    void run("0", true)
    return cancelActive
  }, [connectionId, databaseIdx, filtersKey, matchAll, keyType]) // eslint-disable-line react-hooks/exhaustive-deps

  const reload = useCallback(() => {
    cursorRef.current = "0"
    void run("0", true)
  }, [run])

  const { dataUpdatedAt } = useQuery({
    queryKey: [KEYS_BASE, connectionId, databaseIdx],
    queryFn: () => Date.now(),
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: !!connectionId,
  })
  const firstSignal = useRef(true)
  useEffect(() => {
    if (!dataUpdatedAt) return
    if (firstSignal.current) {
      firstSignal.current = false // the mount run already happened above
      return
    }
    reload()
  }, [dataUpdatedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return
    void run(cursorRef.current, false)
  }, [isLoading, hasMore, run])

  const loadAll = useCallback(async () => {
    if (isLoading || !hasMore) return

    let more = true
    let guard = 0
    while (more && guard++ < 1000) {
      more = await run(cursorRef.current, false)
    }
  }, [isLoading, hasMore, run])

  const cancel = useCallback(() => {
    runIdRef.current++
    cancelActive()
    setIsLoading(false)
    setHasMore(true) // stopped by hand, so there is more of the keyspace left
  }, [cancelActive])

  return { keys, scanned, matched, isLoading, hasMore, error, reload, loadMore, loadAll, cancel }
}
