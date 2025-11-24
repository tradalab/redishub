"use client"

import { DatabaseDetail } from "@/components/app/database-detail/database-detail"
import { useAppContext } from "@/ctx/app"

export default function Page() {
  const { selectedDb, selectedKey } = useAppContext()

  if (!selectedDb) {
    return null
  }

  return <DatabaseDetail databaseId={selectedDb} selectedKey={selectedKey} />
}
