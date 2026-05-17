"use client"

import { useCallback } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { setting } from "@/api"
import type { SettingListRes } from "@/types"

const QUERY_KEY = ["settings"] as const

function useSettingsQuery() {
  return useQuery<SettingListRes>({
    queryKey: QUERY_KEY,
    queryFn: () => setting.list({}),
    staleTime: Infinity,
  })
}

export function useSettings() {
  const q = useSettingsQuery()
  return {
    settings: q.data?.items ?? [],
    loading: q.isLoading,
    refresh: q.refetch,
  }
}

export function useSetting(key: string, options?: { silent?: boolean }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const q = useSettingsQuery()
  const silent = options?.silent

  const value = q.data?.items?.find(s => s.key === key)?.value

  const { mutateAsync } = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => setting.set({ key, value }),
    onMutate: ({ key, value }) => {
      qc.setQueryData<SettingListRes>(QUERY_KEY, prev => {
        const items = prev?.items ?? []
        const idx = items.findIndex(s => s.key === key)
        if (idx === -1) return { items: [...items, { key, value }] }
        const next = [...items]
        next[idx] = { key, value }
        return { items: next }
      })
    },
    onSuccess: () => {
      if (!silent) toast.success(t("updated"))
    },
    onError: e => {
      const msg = e instanceof Error ? e.message : t("unknown_error")
      toast.error(msg)
    },
  })

  const setValue = useCallback(
    async (next: string | ((prev?: string) => string)) => {
      const prev = qc.getQueryData<SettingListRes>(QUERY_KEY)?.items?.find(s => s.key === key)?.value
      const val = typeof next === "function" ? next(prev) : next
      await mutateAsync({ key, value: val })
      return val
    },
    [qc, key, mutateAsync]
  )

  return [value, setValue] as const
}
