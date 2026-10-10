import { create } from "zustand"
import type { KeyFilter } from "@/types"

export interface BrowserView {
  filters: KeyFilter[]
  matchAll: boolean
  keyType: string
  expandedIds: string[]
}

interface BrowserViewStore {
  views: Record<string, BrowserView>
  save: (key: string, view: BrowserView) => void
  drop: (connectionId: string) => void
}

export const browserViewKey = (connectionId: string, databaseIdx: number) => `${connectionId}:${databaseIdx}`

export const useBrowserViewStore = create<BrowserViewStore>(set => ({
  views: {},
  save: (key, view) => set(s => ({ views: { ...s.views, [key]: view } })),
  drop: connectionId => set(s => ({ views: Object.fromEntries(Object.entries(s.views).filter(([k]) => !k.startsWith(`${connectionId}:`))) })),
}))
