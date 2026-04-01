"use client"

import { createContext, useContext } from "react"
import { ProxyDO } from "@/hooks/api/proxy.api"

interface ProxyContextProps {
  open?: (initialValues?: Partial<ProxyDO>) => void
  close?: () => void
}

export const ProxyContext = createContext<ProxyContextProps>({})

export const useProxy = () => useContext(ProxyContext)
