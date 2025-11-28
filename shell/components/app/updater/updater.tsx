"use client"

import { useUpdater } from "@/hooks/use-updater"

export function Updater() {
  useUpdater(true)
  return null
}
