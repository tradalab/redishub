"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import scorix from "@/lib/scorix"
import { v7 as uuidv7 } from "uuid"
import { ConnectionReq as ConnectionDO, ConnectionListRes } from "@/types"

const QUERY_KEY = ["conn-list"]

export function useConnectionList() {
  return useQuery<ConnectionDO[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await scorix.invoke<ConnectionListRes>("connection:list", {})
      return res.items || []
    },
  })
}

export function useUpsertConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<ConnectionDO>) => {
      return scorix.invoke("connection:upsert", values)
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
      await scorix.invoke("connection:delete", { id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
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
