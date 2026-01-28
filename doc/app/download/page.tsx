"use client"

import { useMemo, useState } from "react"
import { Download } from "lucide-react"

const CDN_BASE = "https://cdn.tradalab.com/redishub"
const LATEST_VERSION = "latest"

// type OS = "windows" | "macos" | "linux"
type OS = "windows"
type Arch = "x64"

const MATRIX: Record<OS, { label: string; ext: string; archs: Arch[] }> = {
  windows: { label: "Windows", ext: "msi", archs: ["x64"] },
  // macos: { label: "macOS", ext: "dmg", archs: ["x64", "arm64"] },
  // linux: { label: "Linux", ext: "AppImage", archs: ["x64", "arm64"] },
}

export default function Page() {
  const [os, setOs] = useState<OS>("windows")
  const [arch, setArch] = useState<Arch>("x64")

  const fileName = useMemo(() => {
    const ext = MATRIX[os].ext
    return `RedisHub-${LATEST_VERSION}-${os}-${arch}.${ext}`
  }, [os, arch])

  const downloadUrl = `${CDN_BASE}/${fileName}`

  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100">Download RedisHub</h1>

      <p className="mt-4 text-neutral-600 dark:text-neutral-400">Download the latest version of RedisHub for your system.</p>

      <div className="mt-10">
        <label className="block text-sm font-medium mb-3">Operating System</label>
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(MATRIX) as OS[]).map(key => (
            <button
              key={key}
              onClick={() => {
                setOs(key)
                setArch(MATRIX[key].archs[0])
              }}
              className={`
                rounded-md border px-4 py-3 text-sm font-medium
                ${
                  os === key
                    ? "border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                    : "border-neutral-300 dark:border-neutral-700"
                }
              `}
            >
              {MATRIX[key].label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <label className="block text-sm font-medium mb-3">Architecture</label>
        <div className="flex gap-3">
          {MATRIX[os].archs.map(a => (
            <button
              key={a}
              onClick={() => setArch(a)}
              className={`
                rounded-md border px-4 py-2 text-sm font-medium
                ${
                  arch === a
                    ? "border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                    : "border-neutral-300 dark:border-neutral-700"
                }
              `}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <a
          href={downloadUrl}
          className="
            inline-flex items-center gap-2
            rounded-md bg-indigo-600 px-6 py-3
            text-white font-medium
            hover:bg-indigo-500
          "
        >
          <Download className="h-5 w-5" />
          Download for {MATRIX[os].label} ({arch})
        </a>
        <p className="mt-3 text-xs text-neutral-500 break-all">{downloadUrl}</p>
      </div>
    </main>
  )
}
