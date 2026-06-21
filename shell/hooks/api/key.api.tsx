"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { key as keyApi } from "@/api"

const KEY_VALUE_PAGE_BASE = "redis-key-value-page"

function invalidatePage(
  qc: ReturnType<typeof useQueryClient>,
  connectionId: string,
  databaseIdx: number,
  key: string
) {
  qc.invalidateQueries({ queryKey: [KEY_VALUE_PAGE_BASE, connectionId, databaseIdx, key] })
}

export function useHashFieldDel(connectionId: string, databaseIdx: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: keyApi.hashFieldDel,
    onSuccess: (_, vars) => invalidatePage(qc, connectionId, databaseIdx, vars.key),
  })
}

export function useListItemDel(connectionId: string, databaseIdx: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: keyApi.listItemDel,
    onSuccess: (_, vars) => invalidatePage(qc, connectionId, databaseIdx, vars.key),
  })
}

export function useSetMemberDel(connectionId: string, databaseIdx: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: keyApi.setMemberDel,
    onSuccess: (_, vars) => invalidatePage(qc, connectionId, databaseIdx, vars.key),
  })
}

export function useZsetMemberDel(connectionId: string, databaseIdx: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: keyApi.zSetMemberDel,
    onSuccess: (_, vars) => invalidatePage(qc, connectionId, databaseIdx, vars.key),
  })
}

export function useStreamEntryDel(connectionId: string, databaseIdx: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: keyApi.streamEntryDel,
    onSuccess: (_, vars) => invalidatePage(qc, connectionId, databaseIdx, vars.key),
  })
}
