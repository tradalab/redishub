"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import scorix from "@/lib/scorix"
import { ProxyReq as ProxyDO, ProxyListRes } from "@/types"

const QUERY_KEY = ["proxy-list"]

export function useProxyList() {
  return useQuery<ProxyDO[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await scorix.invoke<ProxyListRes>("proxy:list", {})
      return res.items || []
    },
  })
}

export function useUpsertProxy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<ProxyDO>) => {
      const id = await scorix.invoke<string>("proxy:upsert", values)
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
      return scorix.invoke("proxy:delete", { id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
