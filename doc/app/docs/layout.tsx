import "nextra-theme-docs/style.css"
import React from "react"
import {Layout, Navbar} from "nextra-theme-docs"
import {getPageMap} from "nextra/page-map"
import Image from "next/image"

export default async function DocsLayout({children}: { children: React.ReactNode }) {
  return (
    <Layout
      navbar={
        <Navbar
          logo={
            <div className="flex items-center gap-2">
              <Image src="/logo/favicon-96x96.png" alt="RedisHub Logo" width={32} height={32} className="object-contain"/>
              <span className="font-bold text-lg">
                <span className="text-indigo-500">Redis</span>Hub
              </span>
            </div>
          }
          projectLink={"https://github.com/tradalab/rdms"}
          chatLink={"https://discord.gg/tradalab"}
        />
      }
      docsRepositoryBase={"https://github.com/tradalab/rdms/tree/main/doc"}
      pageMap={await getPageMap("/docs")}
      search={false}
    >
      {children}
    </Layout>
  )
}
