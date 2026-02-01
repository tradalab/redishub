"use client"

import { createContext, ReactNode, useState } from "react"
import { ConfirmOptions } from "./types"
import { ConfirmDialog } from "./confirm-dialog"

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

export const ConfirmContext = createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    options: ConfirmOptions
    resolve: (v: boolean) => void
  } | null>(null)

  const confirm: ConfirmFn = options => new Promise<boolean>(resolve => setState({ options, resolve }))

  const close = (result: boolean) => {
    state?.resolve(result)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {state && <ConfirmDialog options={state.options} onConfirm={() => close(true)} onCancel={() => close(false)} />}
    </ConfirmContext.Provider>
  )
}
