"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { tls } from "@/api"
import { TlsReq as TlsDO } from "@/types"

const QUERY_KEY = ["tls-list"]

export function useTlsList() {
  return useQuery<TlsDO[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await tls.list({})
      return res.items || []
    },
  })
}

export function useUpsertTls() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<TlsDO>) => {
      const { id } = await tls.upsert(values as TlsDO)
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
      return tls.delete({ id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
