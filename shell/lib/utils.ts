import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { GroupDO } from "@/types/group.do"
import { ConnectionDo } from "@/types/connection.do"
import { TreeItem } from "@/components/app/tree"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

export function formatFileSize(bytes: number, decimalPlaces: number = 2): string {
  if (bytes === 0) {
    return "0 Bytes"
  }

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimalPlaces)) + " " + sizes[i]
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

export const buildDbTree = (groups: GroupDO[], connections: ConnectionDo[]): TreeItem[] => {
  const grouped = groups.map(g => ({
    id: g.id,
    name: g.name,
    isGroup: true,
    level: 0,
    group: g,
    children: connections
      .filter(c => c.group_id === g.id)
      .map(c => ({
        id: c.id,
        name: c.name,
        isGroup: false,
        level: 1,
        connection: c,
      })),
  }))

  const ungrouped = connections
    .filter(c => !c.group_id)
    .map(c => ({
      id: c.id,
      name: c.name,
      isGroup: false,
      level: 0,
      connection: c,
    }))

  return [...grouped, ...ungrouped]
}
