import "./globals.css"
import * as React from "react"
import {Geist, Geist_Mono} from "next/font/google"
import Header from "@/components/header"
import {ThemeProvider} from "next-themes"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "RedisHub",
  description: "Modern Redis Client - Fast, lightweight, and cross-platform",
  manifest: "/manifest.json",
  icons: {
    icon: [
      {url: "/logo/favicon-16x16.png", sizes: "16x16", type: "image/png"},
      {url: "/logo/favicon-32x32.png", sizes: "32x32", type: "image/png"},
      {url: "/logo/favicon-96x96.png", sizes: "96x96", type: "image/png"},
      {url: "/logo/android-icon-192x192.png", sizes: "192x192", type: "image/png"},
    ],
    apple: [
      {url: "/logo/apple-icon-57x57.png", sizes: "57x57"},
      {url: "/logo/apple-icon-60x60.png", sizes: "60x60"},
      {url: "/logo/apple-icon-72x72.png", sizes: "72x72"},
      {url: "/logo/apple-icon-76x76.png", sizes: "76x76"},
      {url: "/logo/apple-icon-114x114.png", sizes: "114x114"},
      {url: "/logo/apple-icon-120x120.png", sizes: "120x120"},
      {url: "/logo/apple-icon-144x144.png", sizes: "144x144"},
      {url: "/logo/apple-icon-152x152.png", sizes: "152x152"},
      {url: "/logo/apple-icon-180x180.png", sizes: "180x180"},
    ],
  },
}

export default function RootLayout({children}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
    <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <Header/>
      {children}
    </ThemeProvider>
    </body>
    </html>
  )
}
