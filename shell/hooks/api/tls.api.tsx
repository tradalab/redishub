"use client"

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query"
import scorix from "@/lib/scorix"
import {TlsDO} from "@/types/tls.do"
import {v7 as uuidv7} from "uuid"

const QUERY_KEY = ["tls-list"]

export function useTlsList() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const sql = 'SELECT * FROM "tls" WHERE deleted_at IS NULL'
      const data = await scorix.invoke<TlsDO[]>("mod:gorm:Query", {sql})
      return data || []
    },
  })
}

export function useUpsertTls() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<TlsDO>) => {
      const id = values.id ?? uuidv7()
      const sql = `
        INSERT
        OR REPLACE INTO tls
        (id, name, use_sni, server_name, verify, client_auth, ca_cert, cert, "key")
        VALUES (
          '${id}',
          '${values.name ?? ""}',
          ${values.use_sni ? 1 : 0},
          '${values.server_name ?? ""}',
          ${values.verify ? 1 : 0},
          ${values.client_auth ? 1 : 0},
          '${values.ca_cert ?? ""}',
          '${values.cert ?? ""}',
          '${values.key ?? ""}'
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

export function useDeleteTls() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const sql = `DELETE FROM tls WHERE id = '${id}'`
      await scorix.invoke("mod:gorm:Query", {sql})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: QUERY_KEY})
    },
  })
}
