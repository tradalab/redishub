"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import scorix from "@/lib/scorix"
import { TlsReq as TlsDO, TlsListRes } from "@/types"

const QUERY_KEY = ["tls-list"]

export function useTlsList() {
  return useQuery<TlsDO[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await scorix.invoke<TlsListRes>("tls:list", {})
      return res.items || []
    },
  })
}

export function useUpsertTls() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<TlsDO>) => {
      const id = await scorix.invoke<string>("tls:upsert", values)
      return id
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useDeleteTls() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      return scorix.invoke("tls:delete", { id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
