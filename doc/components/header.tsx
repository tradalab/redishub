"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { SunIcon, MoonIcon, GithubIcon } from "lucide-react"
import Image from "next/image"

export default function Header() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Changelog", href: "/changelog" },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md transition-colors">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo/favicon-96x96.png" alt="RedisHub Logo" width={32} height={32} className="object-contain" />
          <span className="font-bold text-lg">
            <span className="text-indigo-500">Redis</span>Hub
          </span>
        </Link>

        <nav className="hidden md:flex gap-6 text-sm font-medium">
          {navItems.map(item => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  px-2 py-2 transition-colors border-b-2
                  ${isActive ? "border-indigo-500 text-indigo-500" : "border-transparent text-neutral-600 dark:text-neutral-400"}
                  hover:border-indigo-500 hover:text-indigo-500
                `}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="https://github.com/tradalab/redishub"
            target="_blank"
            className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <GithubIcon className="h-5 w-5" />
          </Link>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </header>
  )
}
