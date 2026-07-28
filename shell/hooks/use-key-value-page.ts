"use client"

import { useEffect, useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useKeyValuePageQuery } from "@/hooks/api/client.api"
import { HashType } from "@/types/hash.type"
import { ListType } from "@/types/list.type"
import { SetType } from "@/types/set.type"
import { ZsetType } from "@/types/zset.type"
import { StreamType } from "@/types/stream.type"

type PageItem = HashType | ListType | SetType | ZsetType | StreamType

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

export function useKeyValuePage(connectionId: string, databaseIdx: number, selectedKey: string, kind: string, reloadToken: number, pageSize: number = 200) {
  const qc = useQueryClient()
  const query = useKeyValuePageQuery(connectionId, databaseIdx, selectedKey, kind, pageSize)

  // Force refresh when reloadToken changes
  useEffect(() => {
    if (reloadToken === 0) return
    qc.invalidateQueries({ queryKey: ["redis-key-value-page", connectionId, databaseIdx, selectedKey, kind] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadToken])

  const items = useMemo<PageItem[]>(() => {
    const pages = query.data?.pages ?? []
    const out: PageItem[] = []
    let offset = 0
    for (const page of pages) {
      const mapped = mapItems(page.items ?? [], kind, kind === "list" ? 0 : offset)
      out.push(...mapped)
      offset += mapped.length
    }
    return out
  }, [query.data, kind])

  // The bottom-sentinel + IntersectionObserver wiring now lives in lyra's
  // <DataTable> (infinite mode); this hook just exposes the react-query paging
  // primitives the table drives.
  return {
    items,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasMore: !!query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
  }
}
