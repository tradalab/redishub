"use client"

import { ReactNode, useState } from "react"
import { ConnectionContext } from "./connection.context"
import { ConnectionDialog } from "./connection.dialog"
import { ConnectionDo } from "@/types/connection.do"

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [connection, setConnection] = useState<Partial<ConnectionDo> | null>(null)

  const handleCreate = () => {
    setConnection({
      name: "",
      group_id: "",
      network: "tcp",
      host: "127.0.0.1",
      port: 6379,
      sock: "/tmp/redis.sock",
      username: "",
      password: "",
      ssh_id: "",
      ssh_enable: false,
    })
    setOpen(true)
  }

  const handleEdit = (conn: ConnectionDo) => {
    setConnection(conn)
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setConnection(null)
  }

  return (
    <ConnectionContext.Provider
      value={{
        create: handleCreate,
        edit: handleEdit,
        close: handleClose,
      }}
    >
      {children}
      <ConnectionDialog open={open} onOpenChange={setOpen} connection={connection} />
    </ConnectionContext.Provider>
  )
}
