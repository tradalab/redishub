import { create } from "zustand"

export type TabType = "general" | "console" | "key-detail" | "slow-query"

export interface TabDO {
  id: string
  type: TabType
  title: string
  connectionId: string
  connectionName?: string
  databaseIdx: number
  key?: string
}

interface TabState {
  tabs: TabDO[]
  activeTabId: string | undefined
  addTab: (tab: Omit<TabDO, "id">) => void
  updateTab: (id: string, updates: Partial<TabDO>) => void
  removeTab: (id: string) => void
  setActiveTabId: (id: string | undefined) => void
  closeAll: () => void
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: undefined,

  addTab: (tabData) => {
    const { tabs } = get()
    // Check if tab already exists
    const existingTab = tabs.find(
      (t) =>
        t.type === tabData.type &&
        t.connectionId === tabData.connectionId &&
        t.databaseIdx === tabData.databaseIdx &&
        t.key === tabData.key
    )

    if (existingTab) {
      set({ activeTabId: existingTab.id })
      return
    }

    const newId = crypto.randomUUID()
    const newTab: TabDO = { ...tabData, id: newId }
    set({
      tabs: [...tabs, newTab],
      activeTabId: newId,
    })
  },

  updateTab: (id, updates) => {
    const { tabs } = get()
    set({
      tabs: tabs.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })
  },

  removeTab: (id) => {
    const { tabs, activeTabId } = get()
    const newTabs = tabs.filter((t) => t.id !== id)
    let newActiveId = activeTabId

    if (activeTabId === id) {
      if (newTabs.length > 0) {
        newActiveId = newTabs[newTabs.length - 1].id
      } else {
        newActiveId = undefined
      }
    }

    set({ tabs: newTabs, activeTabId: newActiveId })
  },

  setActiveTabId: (id) => set({ activeTabId: id }),

  closeAll: () => set({ tabs: [], activeTabId: undefined }),
}))
