"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import scorix from "@/lib/scorix"
import { SshDO } from "@/types/ssh.do"

const QUERY_KEY = ["ssh-list"]

export function useSshList() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const sql = 'SELECT * FROM "ssh" WHERE deleted_at IS NULL'
      const data = await scorix.invoke<SshDO[]>("mod:gorm:Query", { sql })
      return data || []
    },
  })
}

export function useUpsertSsh() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<SshDO>) => {
      const id = await scorix.invoke<string>("ssh:upsert", values)
      return id
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useDeleteSsh() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const sql = `DELETE FROM "ssh" WHERE id = '${id}'`
      await scorix.invoke("mod:gorm:Query", { sql })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useTestSsh() {
  return useMutation({
    mutationFn: async (values: Partial<SshDO>) => {
      return scorix.invoke("ssh:test", values)
    },
  })
}
