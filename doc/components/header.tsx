"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { SunIcon, MoonIcon, GithubIcon } from "lucide-react"

export default function Header() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">
          <span className="text-indigo-500">Redis</span>Hub
        </Link>
        {/*<nav className="hidden md:flex gap-6 text-sm text-neutral-600 dark:text-neutral-400">*/}
        {/*  <Link href="/docs" className="hover:text-neutral-900 dark:hover:text-neutral-100">*/}
        {/*    Docs*/}
        {/*  </Link>*/}
        {/*</nav>*/}
        <div className="flex items-center gap-3">
          <Link href="https://github.com/tradalab/redishub" className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800" target="_blank">
            <GithubIcon className="h-5 w-5" />
          </Link>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </header>
  )
}
