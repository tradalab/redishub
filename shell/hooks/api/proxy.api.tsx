"use client"

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query"
import scorix from "@/lib/scorix"
import {v7 as uuidv7} from "uuid"

export interface ProxyDO {
  id: string
  protocol: string
  host: string
  port: number
  username?: string
  password?: string
}

const QUERY_KEY = ["proxy-list"]

export function useProxyList() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const sql = 'SELECT * FROM "proxy" WHERE deleted_at IS NULL'
      const data = await scorix.invoke<ProxyDO[]>("mod:gorm:Query", { sql })
      return data || []
    },
  })
}

export function useUpsertProxy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<ProxyDO>) => {
      const id = values.id ?? uuidv7()
      const sql = `
        INSERT
        OR REPLACE INTO proxy
        (id, protocol, host, port, username, password)
        VALUES (
          '${id}',
          '${values.protocol ?? "http"}',
          '${values.host ?? ""}',
          ${values.port ?? 8080},
          '${values.username ?? ""}',
          '${values.password ?? ""}'
        )
      `
      await scorix.invoke("mod:gorm:Query", {sql})
      return id
    },

    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: QUERY_KEY})
    },
  })
}

export function useDeleteProxy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const sql = `DELETE FROM proxy WHERE id = '${id}'`
      await scorix.invoke("mod:gorm:Query", {sql})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: QUERY_KEY})
    },
  })
}
