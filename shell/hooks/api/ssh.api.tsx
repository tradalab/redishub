"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ssh } from "@/api"
import { SshReq as SshDO } from "@/types"

const QUERY_KEY = ["ssh-list"]

export function useSshList() {
  return useQuery<SshDO[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await ssh.list({})
      return res.items || []
    },
  })
}

export function useUpsertSsh() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<SshDO>) => {
      const { id } = await ssh.upsert(values as SshDO)
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
      return ssh.delete({ id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useTestSsh() {
  return useMutation({
    mutationFn: async (values: Partial<SshDO>) => {
      return ssh.test(values as SshDO)
    },
  })
}
