"use client"

import React, { createContext, ReactNode, useContext, useEffect, useState } from "react"
import { toast } from "sonner"
import { ConnectionDo } from "@/types/connection.do"
import scorix from "@/lib/scorix"
import { I18nextProvider } from "react-i18next"
import i18n from "@/i18n"
import { useSetting } from "@/hooks/use-setting"

interface AppContextType {
  selectedTab: string
  setSelectedTab: (tab: string) => void

  selectedDb?: string
  setSelectedDb: (id?: string) => void

  selectedDbIdx: number
  setSelectedDbIdx: (idx: number) => void

  selectedKey?: string
  setSelectedKey: (id?: string) => void

  selectedSection?: string
  setSelectedSection: (id: string) => void

  loading: boolean
  setLoading: (state: boolean) => void

  connect: (database: ConnectionDo | undefined, dbIdx: number) => Promise<{ total_db: number } | undefined>
  disconnect: (database?: ConnectionDo) => Promise<void>

  language: string | undefined
  setLanguage: (val: string) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [selectedTab, setSelectedTab] = useState<string>("/connections")
  const [selectedSection, setSelectedSection] = useState<string>("general")
  const [selectedDb, setSelectedDb] = useState<string | undefined>()
  const [selectedDbIdx, setSelectedDbIdx] = useState<number>(0)
  const [selectedKey, setSelectedKey] = useState<string | undefined>()
  const [loading, setLoading] = useState<boolean>(false)
  const [language, setLanguage] = useSetting("language")

  useEffect(() => {
    i18n.changeLanguage(language)
  }, [language])

  const connect = async (database: ConnectionDo | undefined, dbIdx: number) => {
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
      return res
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"
      if (msg == `client ${database.id}:${dbIdx} already exists`) {
        setSelectedTab("/browser")
        return
      }
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const disconnect = async (database: ConnectionDo | undefined) => {
    if (!database) {
      return
    }
    try {
      await scorix.invoke("client:disconnect", { connection_id: database.id })
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
      <AppContext.Provider
        value={{
          selectedTab,
          setSelectedTab,
          selectedDb,
          setSelectedDb,
          selectedDbIdx,
          setSelectedDbIdx,
          selectedKey,
          setSelectedKey,
          selectedSection,
          setSelectedSection,
          loading,
          setLoading,
          connect,
          disconnect,
          language,
          setLanguage,
        }}
      >
        {children}
      </AppContext.Provider>
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
