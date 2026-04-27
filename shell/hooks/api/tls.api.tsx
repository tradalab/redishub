"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import scorix from "@/lib/scorix"
import { TlsDO } from "@/types/tls.do"

const QUERY_KEY = ["tls-list"]

export function useTlsList() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const sql = 'SELECT * FROM "tls" WHERE deleted_at IS NULL'
      const data = await scorix.invoke<TlsDO[]>("mod:gorm:Query", { sql })
      return data || []
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
      const sql = `DELETE FROM tls WHERE id = '${id}'`
      await scorix.invoke("mod:gorm:Query", { sql })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
