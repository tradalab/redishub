import "./globals.css"
import * as React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/layout/theme-provider"
import { configs } from "@/configs"
import { AppProvider } from "@/ctx/app"
import { Loading } from "@/components/app/loading"
import { Updater } from "@/components/app/updater/updater"
import { RedisKeysProvider } from "@/ctx/redis-keys.context"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: configs.app.name,
  description: configs.app.desc || configs.app.name,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppProvider>
            <RedisKeysProvider>
              <SidebarProvider
                style={
                  {
                    "--sidebar-width": "360px",
                  } as React.CSSProperties
                }
                open={true}
                defaultOpen={true}
              >
                <AppSidebar />
                <SidebarInset className="flex flex-col h-svh overflow-hidden">
                  <div className="flex-1 min-h-0 flex flex-col">{children}</div>
                  <Toaster />
                  <Loading />
                  <Updater />
                </SidebarInset>
              </SidebarProvider>
            </RedisKeysProvider>
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
