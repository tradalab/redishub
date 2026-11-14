import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

export function formatDuration(totalSeconds: number): string {
  const s = Math.floor(totalSeconds)
  if (s <= 0) return "0s"

  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60

  const parts: string[] = []
  if (days) parts.push(`${days}d`)
  if (hours) parts.push(`${hours}h`)
  if (mins) parts.push(`${mins}m`)
  if (secs && !days && !hours) parts.push(`${secs}s`)

  return parts.slice(0, 2).join(" ") || `${secs}s`
}

type InfoGroup = Record<string, string | number>
type InfoObject = Record<string, InfoGroup>

export function parseRedisInfo(infoText: string): InfoObject {
  const lines = infoText.split("\n")
  const result: InfoObject = {}
  let currentSection: string | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    // Section: "# Something"
    if (line.startsWith("#")) {
      currentSection = line.replace(/^#\s*/, "") // bỏ dấu #
      result[currentSection] = {}
      continue
    }

    // Key:Value from section
    if (currentSection && line.includes(":")) {
      const [key, value] = line.split(":", 2)
      const num = Number(value)
      result[currentSection][key] = isNaN(num) ? value : num
    }
  }

  return result
}
