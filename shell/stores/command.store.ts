import { create } from "zustand"
import { persist } from "zustand/middleware"

interface CommandHistoryItem {
  id: string
  command: string
  timestamp: number
  connectionId: string
  databaseIdx: number
}

interface CommandStoreState {
  history: CommandHistoryItem[]
  addHistory: (item: Omit<CommandHistoryItem, "id" | "timestamp">) => void
  clearHistory: (connectionId?: string) => void
  getHistoryForConnection: (connectionId: string, databaseIdx?: number) => CommandHistoryItem[]
}

const MAX_HISTORY = 1000

export const useCommandStore = create<CommandStoreState>()(
  persist(
    (set, get) => ({
      history: [],
      addHistory: (item) => {
        set((state) => {
          const newItem: CommandHistoryItem = {
            ...item,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
          }
          const newHistory = [newItem, ...state.history].slice(0, MAX_HISTORY)
          return { history: newHistory }
        })
      },
      clearHistory: (connectionId) => {
        set((state) => ({
          history: connectionId ? state.history.filter((h) => h.connectionId !== connectionId) : [],
        }))
      },
      getHistoryForConnection: (connectionId, databaseIdx) => {
        const { history } = get()
        let filtered = history.filter((h) => h.connectionId === connectionId)
        if (databaseIdx !== undefined) {
          filtered = filtered.filter((h) => h.databaseIdx === databaseIdx)
        }
        return filtered
      },
    }),
    {
      name: "redis-command-history",
    }
  )
)
