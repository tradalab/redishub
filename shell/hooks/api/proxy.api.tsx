"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { proxy } from "@/api"
import { ProxyReq as ProxyDO } from "@/types"

const QUERY_KEY = ["proxy-list"]

export function useProxyList() {
  return useQuery<ProxyDO[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await proxy.list({})
      return res.items || []
    },
  })
}

export function useUpsertProxy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<ProxyDO>) => {
      const { id } = await proxy.upsert(values as ProxyDO)
      return id
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useDeleteProxy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      return proxy.delete({ id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
