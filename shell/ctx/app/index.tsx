"use client"

import React, {createContext, useContext, useState, ReactNode, useEffect} from "react"
import {toast} from "sonner"
import {DatabaseDO} from "@/types/database.do"
import scorix from "@/lib/scorix"

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

  connect: (database: DatabaseDO | undefined, dbIdx: number) => Promise<{total_db: number} | undefined>
  disconnect: (database?: DatabaseDO) => Promise<void>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [selectedTab, setSelectedTab] = useState<string>("/databases")
  const [selectedSection, setSelectedSection] = useState<string>("general")
  const [selectedDb, setSelectedDb] = useState<string|undefined>()
  const [selectedDbIdx, setSelectedDbIdx] = useState<number>(0)
  const [selectedKey, setSelectedKey] = useState<string|undefined>()
  const [loading, setLoading] = useState<boolean>(false)

  const connect = async (database: DatabaseDO | undefined, dbIdx: number) => {
    if (!database) {
      return
    }
    setLoading(true)
    try {
      const res = await scorix.invoke<{total_db: number}>("client:connect", { database_id: database.id, database_index: dbIdx })
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

  const disconnect = async (database: DatabaseDO | undefined) => {
    if (!database) {
      return
    }
    try {
      await scorix.invoke("client:disconnect", { database_id: database.id })
      setSelectedDb(undefined)
      setSelectedDbIdx(0)
      toast.success("Disconnected!")
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"
      toast.error(msg)
    }
  }

  useEffect(() => {
    //
  }, [selectedDbIdx])

  return (
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
      }}
    >
      {children}
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
