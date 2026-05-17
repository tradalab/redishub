"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import scorix from "@/lib/scorix"
import { SshReq as SshDO, SshListRes } from "@/types"

const QUERY_KEY = ["ssh-list"]

export function useSshList() {
  return useQuery<SshDO[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await scorix.invoke<SshListRes>("ssh:list", {})
      return res.items || []
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
      return scorix.invoke("ssh:delete", { id })
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
