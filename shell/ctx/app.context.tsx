"use client"

import React, { createContext, ReactNode, useContext, useEffect, useState } from "react"
import { useTabStore } from "@/stores/tab.store"
import { toast } from "sonner"
import { I18nextProvider } from "react-i18next"
import i18n from "@/i18n"
import scorix from "@/lib/scorix"
import { ConnectionDO } from "@/types/connection.do"
import { useSetting } from "@/hooks/use-setting"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SshProvider } from "@/components/app/ssh/ssh.provider"
import { TlsProvider } from "@/components/app/tls/tls.provider"
import { ProxyProvider } from "@/components/app/proxy/proxy.provider"
import { ConnectionProvider } from "@/components/app/connection/connection.provider"
import { GroupProvider } from "@/components/app/group/group.provider"
import { UpdaterProvider } from "@/components/app/updater/updater.provider"
import { useConnectionInfoStore } from "@/stores/connection-info.store"

interface AppContextType {
  selectedTab: string
  setSelectedTab: (tab: string) => void

  selectedDb?: string
  setSelectedDb: (id?: string) => void

  selectedDbIdx: number
  setSelectedDbIdx: (idx: number) => void

  loading: boolean
  setLoading: (state: boolean) => void

  connect: (database: ConnectionDO | undefined, dbIdx: number) => Promise<{ total_db: number } | undefined>
  disconnect: (database?: ConnectionDO) => Promise<void>

  language: string | undefined
  setLanguage: (val: string) => void

  compactMode: boolean
  setCompactMode: (val: boolean) => void
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
  const [selectedTab, setSelectedTab] = useState<string>("/connections")
  const [selectedDb, setSelectedDb] = useState<string | undefined>()
  const [selectedDbIdx, setSelectedDbIdx] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [language, setLanguage] = useSetting("language")
  const [compact, setCompact] = useSetting("compact_mode")
  const compactMode = compact === "true"

  const { tabs, activeTabId, addTab } = useTabStore()
  const [lastSyncTabId, setLastSyncTabId] = useState<string | undefined>()

  useEffect(() => {
    i18n.changeLanguage(language)
  }, [language])

  useEffect(() => {
    if (compactMode) {
      document.documentElement.setAttribute("data-compact", "true")
    } else {
      document.documentElement.removeAttribute("data-compact")
    }
  }, [compactMode])

  useEffect(() => {
    if (!activeTabId || activeTabId === lastSyncTabId) return
    const activeTab = tabs.find(t => t.id === activeTabId)
    if (activeTab) {
      setSelectedDb(activeTab.connectionId)
      setSelectedDbIdx(activeTab.databaseIdx)
      setSelectedTab("/browser")
      setLastSyncTabId(activeTabId)
    }
  }, [activeTabId, tabs, lastSyncTabId])

  const connect = async (database: ConnectionDO | undefined, dbIdx: number) => {
    if (!database) {
      return
    }
    setLoading(true)
    try {
      const res = await scorix.invoke<{ total_db: number }>("client:connect", {
        connection_id: database.id,
        database_index: dbIdx,
      })
      setSelectedDbIdx(dbIdx)
      setSelectedDb(database.id)
      setSelectedTab("/browser")

      addTab({
        type: "general",
        title: database.name || "General",
        connectionId: database.id,
        connectionName: database.name,
        databaseIdx: dbIdx,
      })

      return res
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"
      if (msg == `client ${database.id}:${dbIdx} already exists`) {
        setSelectedTab("/browser")
        addTab({
          type: "general",
          title: database.name || "General",
          connectionId: database.id,
          connectionName: database.name,
          databaseIdx: dbIdx,
        })
        return
      }
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const disconnect = async (database: ConnectionDO | undefined) => {
    if (!database) {
      return
    }
    try {
      await scorix.invoke("client:disconnect", { connection_id: database.id })
      useConnectionInfoStore.getState().clearInfo(database.id)
      setSelectedDb(undefined)
      setSelectedDbIdx(0)
      toast.success("Disconnected!")
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"
      toast.error(msg)
    }
  }

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <AppContext.Provider
          value={{
            selectedTab,
            setSelectedTab,
            selectedDb,
            setSelectedDb,
            selectedDbIdx,
            setSelectedDbIdx,
            loading,
            setLoading,
            connect,
            disconnect,
            language,
            setLanguage,
            compactMode,
            setCompactMode: (val: boolean) => setCompact(val ? "true" : "false"),
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
      </QueryClientProvider>
    </I18nextProvider>
  )
}

export const useAppContext = (): AppContextType => {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error("useAppContext must be used inside AppProvider")
  }
  return ctx
}
