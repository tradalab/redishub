"use client"

import { useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { useSettingStore } from "@/stores/setting.store"

export function useSettings(options?: { silent?: boolean }) {
  const { t } = useTranslation()
  const settings = useSettingStore(s => s.settings)
  const loading = useSettingStore(s => s.loading)
  const fetch = useSettingStore(s => s.fetch)
  const storeSet = useSettingStore(s => s.set)

  useEffect(() => {
    fetch()
  }, [fetch])

  const get = useCallback((key: string) => settings[key], [settings])

  const set = useCallback(
    async (key: string, val: string) => {
      try {
        const v = await storeSet(key, val)
        if (!options?.silent) {
          toast.success(t("updated"))
        }
        return v
      } catch (e) {
        const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
        toast.error(msg)
        throw e
      }
    },
    [storeSet, options?.silent, t]
  )

  return {
    settings,
    loading,
    refresh: fetch,
    get,
    set,
  }
}
