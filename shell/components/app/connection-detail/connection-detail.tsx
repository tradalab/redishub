"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAppContext } from "@/ctx/app.context"
import { ConnectionDetailTabGeneral } from "@/components/app/connection-detail/connection-detail-tab-general"
import { ConnectionDetailTabConsole } from "@/components/app/connection-detail/connection-detail-tab-console"
import { ConnectionDetailTabKeyDetail } from "@/components/app/connection-detail/connection-detail-tab-key-detail"
import { ConnectionDetailTabSlowQuery } from "@/components/app/connection-detail/connection-detail-tab-slow-query"
import { useTranslation } from "react-i18next"

export function ConnectionDetail({ connectionId, selectedKey }: { connectionId: string; selectedKey?: string }) {
  const { t } = useTranslation()
  const { selectedSection, setSelectedSection, selectedDbIdx } = useAppContext()

  const tabs = [
    {
      value: "general",
      name: t("general"),
      content: <ConnectionDetailTabGeneral connectionId={connectionId} databaseIdx={selectedDbIdx} />,
    },
    {
      value: "console",
      name: t("console"),
      content: <ConnectionDetailTabConsole connectionId={connectionId} databaseIdx={selectedDbIdx} />,
    },
    {
      value: "key-detail",
      name: t("key_detail"),
      content: <ConnectionDetailTabKeyDetail connectionId={connectionId} databaseIdx={selectedDbIdx} selectedKey={selectedKey} />,
    },
    {
      value: "slow-query",
      name: t("slow_query"),
      content: <ConnectionDetailTabSlowQuery connectionId={connectionId} databaseIdx={selectedDbIdx} />,
    },
  ]

  return (
    <Tabs value={selectedSection} onValueChange={setSelectedSection} className="min-h-0 p-3.5 h-full">
      <TabsList>
        {tabs.map(tab => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.name}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map(tab => (
        <TabsContent key={tab.value} value={tab.value} className="w-full h-full min-w-0 flex flex-col min-h-0">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
