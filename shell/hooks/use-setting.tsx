"use client"

import { useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { useSettingStore } from "@/stores/setting.store"

export function useSetting(key: string, options?: { silent?: boolean }) {
  const { t } = useTranslation()
  const value = useSettingStore(s => s.settings[key])
  const storeSet = useSettingStore(s => s.set)
  const fetch = useSettingStore(s => s.fetch)
  const silent = options?.silent

  useEffect(() => {
    fetch()
  }, [fetch])

  const setValue = useCallback(
    async (next: string | ((prev?: string) => string)) => {
      const prev = useSettingStore.getState().settings[key]
      const val = typeof next === "function" ? next(prev) : next
      try {
        await storeSet(key, val)
        if (!silent) toast.success(t("updated"))
        return val
      } catch (e) {
        const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
        toast.error(msg)
        throw e
      }
    },
    [storeSet, key, silent, t]
  )

  return [value, setValue] as const
}
