"use client"

import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react"
import { closedConnections, useTabStore } from "@/stores/tab.store"
import { useBrowserViewStore } from "@/stores/browser-view.store"
import { isWebMode } from "@/lib/mode"
import { toast } from "@tradalab/lyra/ui"
import { I18nextProvider } from "react-i18next"
import i18n from "@/i18n"
import { ConnectionReq as ConnectionDO } from "@/types"
import { useSetting } from "@/hooks/api/setting.api"
import { useCompact, usePlate, type Plate } from "@tradalab/lyra/blocks"
import { useConnect, useDisconnect } from "@/hooks/api/client.api"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SshProvider } from "@/app/_components/ssh/ssh.provider"
import { TlsProvider } from "@/app/_components/tls/tls.provider"
import { ProxyProvider } from "@/app/_components/proxy/proxy.provider"
import { ConnectionProvider } from "@/app/_components/connection/connection.provider"
import { GroupProvider } from "@/app/_components/group/group.provider"
import { UpdaterProvider } from "@/app/_components/updater/updater.provider"

interface AppContextType {
  selectedTab: string
  setSelectedTab: (tab: string) => void

  selectedDb?: string
  selectedDbIdx: number

  loading: boolean
  setLoading: (state: boolean) => void

  connect: (database: ConnectionDO | undefined, dbIdx: number) => Promise<any>
  disconnect: (database: ConnectionDO | undefined) => Promise<void>

  language: string | undefined
  setLanguage: (val: string) => void

  compactMode: boolean
  setCompactMode: (val: boolean) => void

  plate: Plate | null
  setPlate: (val: Plate | null) => void
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: Infinity,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider = ({ children }: { children: ReactNode }) => {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <AppContextInner>{children}</AppContextInner>
      </QueryClientProvider>
    </I18nextProvider>
  )
}

function AppContextInner({ children }: { children: ReactNode }) {
  const [selectedTab, setSelectedTab] = useState<string>("/connections")
  const [loading, setLoading] = useState<boolean>(false)
  const [language, setLanguage] = useSetting("language")
  const [compactMode, setCompactMode] = useCompact()
  const [plate, setPlate] = usePlate()

  const { tabs, activeTabId, addTab } = useTabStore()
  const activeTab = tabs.find(t => t.id === activeTabId)
  const selectedDb = activeTab?.connectionId
  const selectedDbIdx = activeTab?.databaseIdx ?? 0

  const connectMutation = useConnect()
  const disconnectMutation = useDisconnect()
  const disconnectAsync = disconnectMutation.mutateAsync

  useEffect(() => {
    i18n.changeLanguage(language)
  }, [language])

  useEffect(() => {
    setSelectedTab(activeTabId ? "/browser" : "/connections")
  }, [activeTabId])

  const disconnecting = useRef(new Set<string>())
  const openIds = useRef(new Set<string>())
  useEffect(() => {
    for (const id of closedConnections(openIds.current, tabs)) {
      if (disconnecting.current.delete(id)) continue
      useBrowserViewStore.getState().drop(id)
      if (!isWebMode()) disconnectAsync({ connection_id: id }).catch(console.error)
    }
    openIds.current = new Set(tabs.map(t => t.connectionId))
  }, [tabs, disconnectAsync])

  const connect = async (database: ConnectionDO | undefined, dbIdx: number) => {
    if (!database) return
    setLoading(true)
    try {
      await connectMutation.mutateAsync({ connection_id: database.id, database_index: dbIdx })
      setSelectedTab("/browser")
      addTab({
        type: "general",
        title: database.name || "General",
        connectionId: database.id,
        connectionName: database.name,
        databaseIdx: dbIdx,
      })
      return {}
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"
      toast.add({ title: msg, type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const disconnect = async (database: ConnectionDO | undefined) => {
    if (!database) return
    try {
      await disconnectMutation.mutateAsync({ connection_id: database.id })
      if (useTabStore.getState().tabs.some(t => t.connectionId === database.id)) disconnecting.current.add(database.id)
      useTabStore.getState().removeConnectionTabs(database.id)
      useBrowserViewStore.getState().drop(database.id)
      toast.add({ title: "Disconnected!", type: "success" })
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"
      toast.add({ title: msg, type: "error" })
    }
  }

  return (
    <AppContext.Provider
      value={{
        selectedTab,
        setSelectedTab,
        selectedDb,
        selectedDbIdx,
        loading,
        setLoading,
        connect,
        disconnect,
        language,
        setLanguage,
        compactMode,
        setCompactMode,
        plate,
        setPlate,
      }}
    >
      <UpdaterProvider>
        <SshProvider>
          <TlsProvider>
            <ProxyProvider>
              <ConnectionProvider>
                <GroupProvider>{children}</GroupProvider>
              </ConnectionProvider>
            </ProxyProvider>
          </TlsProvider>
        </SshProvider>
      </UpdaterProvider>
    </AppContext.Provider>
  )
}

export const useAppContext = (): AppContextType => {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error("useAppContext must be used inside AppProvider")
  }
  return ctx
}
