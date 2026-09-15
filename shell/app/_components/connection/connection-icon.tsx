"use client"

import { BoxesIcon, DatabaseIcon, RadarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { CONNECTION_COLORS, type ConnectionColor } from "@/lib/connection-color"

const MODE_ICON = {
  standalone: DatabaseIcon,
  sentinel: RadarIcon,
  cluster: BoxesIcon,
} as const

export function ConnectionModeIcon({ mode, color, className }: { mode?: string; color?: ConnectionColor; className?: string }) {
  const Icon = MODE_ICON[mode as keyof typeof MODE_ICON] ?? DatabaseIcon
  return <Icon className={cn("size-4", color && CONNECTION_COLORS[color].tint, className)} />
}
