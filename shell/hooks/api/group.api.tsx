"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { group } from "@/api"
import { v7 as uuidv7 } from "uuid"
import { GroupItem as GroupDO } from "@/types"

const QUERY_KEY = ["group-list"]

export function useGroupList() {
  return useQuery<GroupDO[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await group.list({})
      return res.items || []
    },
  })
}

export function useUpsertGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<GroupDO>) => {
      const id = values.id ?? uuidv7()
      await group.upsert({ id, name: values.name ?? "" })
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useDeleteGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      return group.delete({ id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
