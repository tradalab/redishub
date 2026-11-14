"use client"

import { useCallback } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "@tradalab/lyra/ui"
import { useTranslation } from "react-i18next"
import { store } from "@/api/modules"

const QUERY_KEY = ["settings"] as const

type Settings = Record<string, string>

function useSettingsQuery() {
  return useQuery<Settings>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const all = await store.all()
      return Object.fromEntries(Object.entries(all ?? {}).filter((e): e is [string, string] => typeof e[1] === "string"))
    },
    staleTime: Infinity,
  })
}

export function useSettings() {
  const q = useSettingsQuery()
  return {
    settings: q.data ?? {},
    loading: q.isLoading,
    refresh: q.refetch,
  }
}

export function useSetting(key: string, options?: { silent?: boolean }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const q = useSettingsQuery()
  const silent = options?.silent

  const value = q.data?.[key]

  const { mutateAsync } = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => store.set({ key, value }),
    onMutate: ({ key, value }) => {
      qc.setQueryData<Settings>(QUERY_KEY, prev => ({ ...prev, [key]: value }))
    },
    onSuccess: () => {
      if (!silent) toast.add({ title: t("updated"), type: "success" })
    },
    onError: e => {
      const msg = e instanceof Error ? e.message : t("unknown_error")
      toast.add({ title: msg, type: "error" })
    },
  })

  const setValue = useCallback(
    async (next: string | ((prev?: string) => string)) => {
      const prev = qc.getQueryData<Settings>(QUERY_KEY)?.[key]
      const val = typeof next === "function" ? next(prev) : next
      await mutateAsync({ key, value: val })
      return val
    },
    [qc, key, mutateAsync]
  )

  return [value, setValue] as const
}
