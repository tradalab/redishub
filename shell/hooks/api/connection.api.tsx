"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import scorix from "@/lib/scorix"
import { v7 as uuidv7 } from "uuid"
import { ConnectionDO } from "@/types/connection.do"

const QUERY_KEY = ["conn-list"]

export function useConnectionList() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const sql = 'SELECT * FROM "connection" WHERE deleted_at IS NULL'
      const data = await scorix.invoke<ConnectionDO[]>("mod:gorm:Query", { sql })
      return data || []
    },
  })
}

export function useUpsertConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<ConnectionDO>) => {
      const id = values.id ?? uuidv7()
      const sql = `
        INSERT
        OR REPLACE INTO "connection"
        (id, name, network, host, port, sock, username, password, group_id, ssh_id, ssh_enable, tls_id, tls_enable, exec_timeout, dial_timeout, key_size)
        VALUES (
          '${id}',
          '${values.name ?? ""}',
          '${values.network ?? ""}',
          '${values.host ?? ""}',
          ${values.port ?? 22},
          '${values.sock ?? ""}',
          '${values.username ?? ""}',
          '${values.password ?? ""}',
          ${values.group_id ? `'${values.group_id}'` : 'NULL'},
          ${values.ssh_id ? `'${values.ssh_id}'` : 'NULL'},
          ${values.ssh_enable ? 1 : 0},
          ${values.tls_id ? `'${values.tls_id}'` : 'NULL'},
          ${values.tls_enable ? 1 : 0},
          ${values.exec_timeout ?? 60},
          ${values.dial_timeout ?? 60},
          ${values.key_size ?? 10000}
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

export function useDeleteConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const sql = `DELETE FROM "connection" WHERE id = '${id}'`
      await scorix.invoke("mod:gorm:Query", {sql})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: QUERY_KEY})
    },
  })
}

export function useTestConnection() {
  return useMutation({
    mutationFn: async (values: Partial<ConnectionDO>) => {
      return scorix.invoke("conn:test", values)
    },
  })
}
