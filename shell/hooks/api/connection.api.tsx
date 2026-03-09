"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import scorix from "@/lib/scorix"
import { v7 as uuidv7 } from "uuid"
import { ConnectionDo } from "@/types/connection.do"

const QUERY_KEY = ["conn-list"]

export function useConnectionList() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const data = await scorix.invoke<ConnectionDo[]>(
        "ext:gorm:Query",
        'SELECT * FROM "connection" WHERE deleted_at IS NULL'
      )
      return data || []
    },
  })
}

export function useUpsertConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<ConnectionDo>) => {
      const id = values.id ?? uuidv7()
      const sql = `
        INSERT
        OR REPLACE INTO "connection"
        (id, name, network, host, port, sock, username, password, group_id, ssh_id, ssh_enable)
        VALUES (
          '${id}',
          '${values.name ?? ""}',
          '${values.network ?? ""}',
          '${values.host ?? ""}',
          ${values.port ?? 22},
          '${values.sock ?? ""}',
          '${values.username ?? ""}',
          '${values.password ?? ""}',
          '${values.group_id ?? ""}',
          '${values.ssh_id ?? ""}',
          ${values.ssh_enable ?? false}
        )
      `
      await scorix.invoke("ext:gorm:Query", sql)
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
      await scorix.invoke("ext:gorm:Query", sql)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: QUERY_KEY})
    },
  })
}

export function useTestConnection() {
  return useMutation({
    mutationFn: async (values: Partial<ConnectionDo>) => {
      return scorix.invoke("conn:test", values)
    },
  })
}
