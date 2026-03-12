"use client"

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query"
import scorix from "@/lib/scorix"
import {v7 as uuidv7} from "uuid"
import {GroupDO} from "@/types/group.do"

const QUERY_KEY = ["group-list"]

export function useGroupList() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const data = await scorix.invoke<GroupDO[]>(
        "ext:gorm:Query",
        'SELECT * FROM "group" WHERE deleted_at IS NULL'
      )
      return data || []
    },
  })
}

export function useUpsertGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<GroupDO>) => {
      const id = values.id ?? uuidv7()
      const sql = `INSERT OR REPLACE INTO "group" (id, name) VALUES ('${id}', '${values.name ?? ""}')`
      await scorix.invoke("ext:gorm:Query", sql)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: QUERY_KEY})
    },
  })
}

export function useDeleteGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const sql = `DELETE FROM "group" WHERE id = '${id}'`
      await scorix.invoke("ext:gorm:Query", sql)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: QUERY_KEY})
    },
  })
}
