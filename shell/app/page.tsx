"use client"

import { useAppContext } from "@/ctx/app.context"
import { useTabStore } from "@/stores/tab.store"
import { TabBar } from "@/components/layout/tab-bar"
import { ConnectionDetailTabGeneral } from "@/components/app/connection-detail/connection-detail-tab-general"
import { ConnectionDetailTabConsole } from "@/components/app/connection-detail/connection-detail-tab-console"
import { ConnectionDetailTabKeyDetail } from "@/components/app/connection-detail/connection-detail-tab-key-detail"
import { ConnectionDetailTabSlowQuery } from "@/components/app/connection-detail/connection-detail-tab-slow-query"
import { ConnectionDetailTabPubSub } from "@/components/app/connection-detail/connection-detail-tab-pubsub"

export default function Page() {
  const { selectedDb } = useAppContext()
  const { tabs, activeTabId } = useTabStore()

  if (!selectedDb) {
    return null
  }

  const activeTab = tabs.find(t => t.id === activeTabId)

  return (
    <div className="flex flex-col h-full min-h-0">
      <TabBar />
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab ? (
          <>
            {activeTab.type === "general" && <ConnectionDetailTabGeneral connectionId={activeTab.connectionId} databaseIdx={activeTab.databaseIdx} />}
            {activeTab.type === "console" && <ConnectionDetailTabConsole connectionId={activeTab.connectionId} databaseIdx={activeTab.databaseIdx} />}
            {activeTab.type === "key-detail" && (
              <ConnectionDetailTabKeyDetail connectionId={activeTab.connectionId} databaseIdx={activeTab.databaseIdx} selectedKey={activeTab.key} />
            )}
            {activeTab.type === "slow-query" && <ConnectionDetailTabSlowQuery connectionId={activeTab.connectionId} databaseIdx={activeTab.databaseIdx} />}
            {activeTab.type === "pubsub" && <ConnectionDetailTabPubSub connectionId={activeTab.connectionId} databaseIdx={activeTab.databaseIdx} />}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">Select an item from the sidebar to open a tab</div>
        )}
      </div>
    </div>
  )
}
