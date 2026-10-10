import { create } from "zustand"
import { v7 as uuidv7 } from "uuid"

export type TabType = "general" | "console" | "key-detail" | "slow-query" | "pubsub" | "key-list" | "monitor" | "analysis"

export interface TabDO {
  id: string
  type: TabType
  title: string
  connectionId: string
  connectionName?: string
  databaseIdx: number
  key?: string
  pinned?: boolean
}

interface TabState {
  tabs: TabDO[]
  activeTabId: string | undefined
  mru: string[]
  addTab: (tab: Omit<TabDO, "id" | "pinned">) => void
  updateTab: (id: string, updates: Partial<TabDO>) => void
  removeTab: (id: string) => void
  setActiveTabId: (id: string | undefined) => void
  togglePin: (id: string) => void
  closeOthers: (id: string) => void
  closeAll: () => void
  removeConnectionTabs: (connectionId: string) => void
}

const touch = (mru: string[], tabs: TabDO[], id: string | undefined) => {
  const live = mru.filter(x => x !== id && tabs.some(t => t.id === x))
  return id ? [id, ...live] : live
}

export function pickConnectionTab(state: Pick<TabState, "tabs" | "mru">, connectionId: string): TabDO | undefined {
  const own = state.tabs.filter(t => t.connectionId === connectionId)
  for (const id of state.mru) {
    const tab = own.find(t => t.id === id)
    if (tab) return tab
  }
  return own[own.length - 1]
}

export function openConnectionIds(tabs: TabDO[]): string[] {
  return [...new Set(tabs.map(t => t.connectionId))]
}

export function closedConnections(before: Iterable<string>, tabs: TabDO[]): string[] {
  const open = new Set(tabs.map(t => t.connectionId))
  return [...before].filter(id => !open.has(id))
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: undefined,
  mru: [],

  addTab: tabData => {
    const { tabs } = get()
    // Check if tab already exists
    const existingTab = tabs.find(
      t => t.type === tabData.type && t.connectionId === tabData.connectionId && t.databaseIdx === tabData.databaseIdx && t.key === tabData.key
    )

    if (existingTab) {
      set({ activeTabId: existingTab.id, mru: touch(get().mru, tabs, existingTab.id) })
      return
    }

    const newId = uuidv7()
    const newTab: TabDO = { ...tabData, id: newId, pinned: false }
    const newTabs = [...tabs, newTab]

    // Keep pinned tabs at the beginning
    const sortedTabs = [...newTabs.filter(t => t.pinned), ...newTabs.filter(t => !t.pinned)]

    set({
      tabs: sortedTabs,
      activeTabId: newId,
      mru: touch(get().mru, sortedTabs, newId),
    })
  },

  updateTab: (id, updates) => {
    const { tabs } = get()
    const newTabs = tabs.map(t => (t.id === id ? { ...t, ...updates } : t))
    // Re-sort if pinned status changed
    const sortedTabs = [...newTabs.filter(t => t.pinned), ...newTabs.filter(t => !t.pinned)]
    set({ tabs: sortedTabs })
  },

  removeTab: id => {
    const { tabs, activeTabId } = get()
    const newTabs = tabs.filter(t => t.id !== id)
    let newActiveId = activeTabId

    if (activeTabId === id) {
      if (newTabs.length > 0) {
        newActiveId = newTabs[newTabs.length - 1].id
      } else {
        newActiveId = undefined
      }
    }

    set({ tabs: newTabs, activeTabId: newActiveId, mru: touch(get().mru, newTabs, newActiveId) })
  },

  setActiveTabId: id => set({ activeTabId: id, mru: touch(get().mru, get().tabs, id) }),

  togglePin: id => {
    const { tabs } = get()
    const newTabs = tabs.map(t => (t.id === id ? { ...t, pinned: !t.pinned } : t))
    const sortedTabs = [...newTabs.filter(t => t.pinned), ...newTabs.filter(t => !t.pinned)]
    set({ tabs: sortedTabs })
  },

  closeOthers: id => {
    const { tabs } = get()
    const newTabs = tabs.filter(t => t.id === id || t.pinned)
    set({ tabs: newTabs, activeTabId: id, mru: touch(get().mru, newTabs, id) })
  },

  closeAll: () => {
    const { tabs, activeTabId } = get()
    const pinnedTabs = tabs.filter(t => t.pinned)
    let newActiveId = activeTabId
    if (activeTabId && !pinnedTabs.find(t => t.id === activeTabId)) {
      newActiveId = pinnedTabs.length > 0 ? pinnedTabs[0].id : undefined
    }
    set({ tabs: pinnedTabs, activeTabId: newActiveId, mru: touch(get().mru, pinnedTabs, newActiveId) })
  },

  removeConnectionTabs: connectionId => {
    const { tabs, activeTabId } = get()
    const newTabs = tabs.filter(t => t.connectionId !== connectionId)
    const newActiveId = newTabs.some(t => t.id === activeTabId) ? activeTabId : newTabs[newTabs.length - 1]?.id
    set({ tabs: newTabs, activeTabId: newActiveId, mru: touch(get().mru, newTabs, newActiveId) })
  },
}))
