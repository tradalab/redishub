"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { SettingDO } from "@/types/setting.do"
import scorix from "@/lib/scorix"
import { toast } from "sonner"

export function useSettings() {
  const { t } = useTranslation()

  const [settings, setSettings] = useState<SettingDO[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const data = await scorix.invoke<SettingDO[]>("ext:gorm:Query", 'SELECT * FROM "setting" WHERE deleted_at IS NULL ORDER BY key')
      setSettings(data || [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [t])

  // ========= upsert =========
  const set = useCallback(
    async (key: string, val: string) => {
      try {
        const k = sqlEscape(key)
        const v = sqlEscape(val)

        const result = await scorix.invoke<SettingDO[]>(
          "ext:gorm:Query",
          `
            INSERT INTO "setting" (key, val)
            VALUES ('${k}', '${v}') ON CONFLICT (key)
          DO
            UPDATE SET
              val = EXCLUDED.val
              RETURNING *
          `
        )

        const updated = result?.[0]
        if (!updated) return

        setSettings(prev => {
          const idx = prev.findIndex(s => s.key === key)
          if (idx === -1) return [...prev, updated]
          const next = [...prev]
          next[idx] = updated
          return next
        })

        toast.success(t("updated"))
        return updated.val
      } catch (e) {
        const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
        toast.error(msg)
        throw e
      }
    },
    [t]
  )

  const map = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of settings) {
      m.set(s.key, s.val)
    }
    return m
  }, [settings])

  const get = useCallback((key: string) => map.get(key), [map])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return {
    settings,
    loading,
    refresh: fetchSettings,

    get,
    set,
  }
}

function sqlEscape(v: string) {
  return v.replace(/'/g, "''")
}
