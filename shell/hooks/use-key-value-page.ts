"use client"

import { useCallback, useEffect, useReducer, useRef } from "react"
import scorix from "@/lib/scorix"
import { HashType } from "@/types/hash.type"
import { ListType } from "@/types/list.type"
import { SetType } from "@/types/set.type"
import { ZsetType } from "@/types/zset.type"
import { StreamType } from "@/types/stream.type"

type PageItem = HashType | ListType | SetType | ZsetType | StreamType

type State = {
  items: PageItem[]
  cursor: string
  hasMore: boolean
  isLoading: boolean
}

type Action =
  | { type: "RESET"; cursor: string }
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; items: PageItem[]; nextCursor: string; hasMore: boolean }
  | { type: "LOAD_ERROR" }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "RESET":
      return { items: [], cursor: action.cursor, hasMore: true, isLoading: false }
    case "LOAD_START":
      return { ...state, isLoading: true }
    case "LOAD_SUCCESS":
      return {
        items: [...state.items, ...action.items],
        cursor: action.nextCursor,
        hasMore: action.hasMore,
        isLoading: false,
      }
    case "LOAD_ERROR":
      return { ...state, isLoading: false, hasMore: false }
    default:
      return state
  }
}

function mapItems(rawItems: any[], kind: string, offset: number): PageItem[] {
  switch (kind) {
    case "hash":
      return rawItems.map((item, i) => ({ id: offset + i, key: item.field, value: item.value }) as HashType)
    case "list":
      return rawItems.map(item => ({ id: item.index, value: item.value }) as ListType)
    case "set":
      return rawItems.map((item, i) => ({ id: offset + i, value: item.member }) as SetType)
    case "zset":
      return rawItems.map((item, i) => ({ id: offset + i, member: item.member, score: item.score }) as ZsetType)
    case "stream":
      return rawItems.map(item => ({ id: item.id, value: JSON.stringify(item.value || {}) }) as StreamType)
    default:
      return []
  }
}

export function useKeyValuePage(
  connectionId: string,
  databaseIdx: number,
  selectedKey: string,
  kind: string,
  reloadToken: number,
  pageSize: number = 200
) {
  const [state, dispatch] = useReducer(reducer, {
    items: [],
    cursor: "0",
    hasMore: true,
    isLoading: false,
  })

  const itemCountRef = useRef(0)
  itemCountRef.current = state.items.length

  // Keep latest state in a ref so scroll/post-load callbacks always read current values
  const stateRef = useRef(state)
  stateRef.current = state

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const wasLoadingRef = useRef(false)

  const loadPage = useCallback(
    async (cursor: string) => {
      dispatch({ type: "LOAD_START" })
      try {
        const result = await scorix.invoke<{ items: any[]; next_cursor: string; has_more: boolean }>(
          "client:load-key-value-page",
          {
            connection_id: connectionId,
            database_index: databaseIdx,
            key: selectedKey,
            kind,
            cursor,
            page_size: pageSize,
          }
        )
        const offset = kind === "list" ? 0 : itemCountRef.current
        const mapped = mapItems(result.items || [], kind, offset)
        dispatch({
          type: "LOAD_SUCCESS",
          items: mapped,
          nextCursor: result.next_cursor,
          hasMore: result.has_more,
        })
      } catch {
        dispatch({ type: "LOAD_ERROR" })
      }
    },
    [connectionId, databaseIdx, selectedKey, kind, pageSize]
  )

  // Reset and load first page when key/connection/kind/reloadToken changes
  useEffect(() => {
    dispatch({ type: "RESET", cursor: "0" })
    loadPage("0")
  }, [selectedKey, kind, reloadToken, loadPage])

  // Scroll listener: auto-load next page when sentinel is near the bottom of the scroll container
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const check = () => {
      if (!stateRef.current.hasMore || stateRef.current.isLoading) return
      const rect = sentinel.getBoundingClientRect()
      if (rect.top < window.innerHeight + 200) {
        loadPage(stateRef.current.cursor)
      }
    }

    // Find the nearest scrollable ancestor to listen on
    let scrollEl: Element | null = sentinel.parentElement
    while (scrollEl && scrollEl !== document.documentElement) {
      const { overflow, overflowY } = window.getComputedStyle(scrollEl)
      if (overflow === "auto" || overflow === "scroll" || overflowY === "auto" || overflowY === "scroll") {
        break
      }
      scrollEl = scrollEl.parentElement
    }
    const scrollTarget: EventTarget = scrollEl && scrollEl !== document.documentElement ? scrollEl : window

    scrollTarget.addEventListener("scroll", check, { passive: true })
    // Initial check: sentinel may already be visible without any scroll
    const raf = requestAnimationFrame(check)

    return () => {
      scrollTarget.removeEventListener("scroll", check)
      cancelAnimationFrame(raf)
    }
  }, [loadPage])

  // Post-load check: after each page completes, re-check if sentinel is still visible
  // (scroll listener only fires on user scroll, not on data changes)
  useEffect(() => {
    const justFinishedLoading = wasLoadingRef.current && !state.isLoading
    wasLoadingRef.current = state.isLoading

    if (!justFinishedLoading) return

    const raf = requestAnimationFrame(() => {
      const current = stateRef.current
      if (!current.hasMore || current.isLoading) return
      const sentinel = sentinelRef.current
      if (!sentinel) return
      const rect = sentinel.getBoundingClientRect()
      if (rect.top < window.innerHeight) {
        loadPage(current.cursor)
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [state.isLoading, loadPage])

  return {
    items: state.items,
    isLoading: state.isLoading,
    hasMore: state.hasMore,
    sentinelRef,
  }
}
