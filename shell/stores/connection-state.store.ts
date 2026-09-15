import { create } from "zustand"
import type { ClientStateEvent } from "@/types"

interface ConnectionStateStore {
  byId: Record<string, ClientStateEvent>
  apply: (ev: ClientStateEvent) => void
  replace: (items: ClientStateEvent[]) => void
}

export const useConnectionStateStore = create<ConnectionStateStore>(set => ({
  byId: {},
  apply: ev =>
    set(s => {
      const byId = { ...s.byId }
      if (ev.state === "idle") delete byId[ev.connection_id]
      else byId[ev.connection_id] = ev
      return { byId }
    }),
  replace: items => set({ byId: Object.fromEntries(items.map(i => [i.connection_id, i])) }),
}))

export function useConnectionState(connectionId: string | undefined): ClientStateEvent | undefined {
  return useConnectionStateStore(s => (connectionId ? s.byId[connectionId] : undefined))
}
