"use client"

import { useCallback } from "react"
import { useSettings } from "./use-settings"

export function useSetting(key: string, options?: { silent?: boolean }) {
  const { get, set } = useSettings(options)

  const value = get(key)

  const setValue = useCallback(
    async (next: string | ((prev?: string) => string)) => {
      const prev = get(key)
      const val = typeof next === "function" ? next(prev) : next
      return set(key, val)
    },
    [get, set, key]
  )

  return [value, setValue] as const
}
