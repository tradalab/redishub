"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatabaseDetailTabGeneral } from "@/components/app/database-detail/database-detail-tab-general"
import { DatabaseDetailTabKeyDetail } from "@/components/app/database-detail/database-detail-tab-key-detail"
import { useAppContext } from "@/ctx/app"
import { DatabaseDetailTabSlowQuery } from "@/components/app/database-detail/database-detail-tab-slow-query"
import { DatabaseDetailTabConsole } from "@/components/app/database-detail/database-detail-tab-console"

export function DatabaseDetail({ databaseId, selectedKey }: { databaseId: string; selectedKey?: string }) {
  const { selectedSection, setSelectedSection, selectedDbIdx } = useAppContext()

  const tabs = [
    {
      value: "general",
      name: "General",
      content: <DatabaseDetailTabGeneral databaseId={databaseId} databaseIdx={selectedDbIdx} />,
    },
    {
      value: "console",
      name: "Console",
      content: <DatabaseDetailTabConsole databaseId={databaseId} databaseIdx={selectedDbIdx} />,
    },
    {
      value: "key-detail",
      name: "Key Detail",
      content: <DatabaseDetailTabKeyDetail databaseId={databaseId} databaseIdx={selectedDbIdx} selectedKey={selectedKey} />,
    },
    {
      value: "slow-query",
      name: "Slow Query",
      content: <DatabaseDetailTabSlowQuery databaseId={databaseId} databaseIdx={selectedDbIdx} />,
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
