"use client"

import { ConnectionDetail } from "@/components/app/connection-detail/connection-detail"
import { useAppContext } from "@/ctx/app.context"

export default function Page() {
  const { selectedDb, selectedKey } = useAppContext()

  if (!selectedDb) {
    return null
  }

  return <ConnectionDetail connectionId={selectedDb} selectedKey={selectedKey} />
}
