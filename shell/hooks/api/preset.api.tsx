"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { preset } from "@/api"
import type { SearchPresetItem, SearchPresetUpsertReq } from "@/types"

const QUERY_KEY = ["search-presets"]

export function usePresetList() {
  return useQuery<SearchPresetItem[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await preset.list({})
      return res.items || []
    },
  })
}

export function usePresetUpsert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: SearchPresetUpsertReq) => preset.upsert(params),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function usePresetDelete() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => preset.delete({ id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
