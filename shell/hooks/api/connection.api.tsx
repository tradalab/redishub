"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { connection, conn } from "@/api"
import { ConnectionReq as ConnectionDO } from "@/types"

const QUERY_KEY = ["conn-list"]

export function useConnectionList() {
  return useQuery<ConnectionDO[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await connection.list({})
      return res.items || []
    },
  })
}

export function useUpsertConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<ConnectionDO>) => {
      return connection.upsert(values as ConnectionDO)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useDeleteConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await connection.delete({ id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useTestConnection() {
  return useMutation({
    mutationFn: async (values: Partial<ConnectionDO>) => {
      return conn.test(values as ConnectionDO)
    },
  })
}
