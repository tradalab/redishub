import { create } from "zustand"
import scorix from "@/lib/scorix"
import type { SettingListRes } from "@/types"

interface SettingState {
  settings: Record<string, string>
  loading: boolean
  fetched: boolean
  fetchPromise: Promise<void> | null
  fetch: () => Promise<void>
  set: (key: string, value: string) => Promise<string>
}

export const useSettingStore = create<SettingState>((set, get) => ({
  settings: {},
  loading: false,
  fetched: false,
  fetchPromise: null,

  fetch: async () => {
    const { fetched, fetchPromise } = get()
    if (fetched) return
    if (fetchPromise) return fetchPromise

    const p = (async () => {
      set({ loading: true })
      try {
        const res = await scorix.invoke<SettingListRes>("setting:list", {})
        const map: Record<string, string> = {}
        for (const s of res.items || []) {
          map[s.key] = s.value
        }
        set({ settings: map, fetched: true })
      } finally {
        set({ loading: false, fetchPromise: null })
      }
    })()

    set({ fetchPromise: p })
    return p
  },

  set: async (key, value) => {
    await scorix.invoke("setting:set", { key, value })
    set(state => ({
      settings: { ...state.settings, [key]: value },
    }))
    return value
  },
}))
