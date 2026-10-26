import { transfer } from "@/api"
import { isWebMode } from "@/lib/mode"

export type ExportFile = { name: string; ext: "csv" | "json"; content: string }

// Without a BOM, Excel reads a CSV in the system code page and garbles Vietnamese and Japanese.
const BOM = "﻿"

export function toCsv(header: string[], rows: (string | number)[][]): string {
  const cell = (v: string | number) => {
    const s = String(v)
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return BOM + [header, ...rows].map(r => r.map(cell).join(",")).join("\r\n") + "\r\n"
}

export const toJson = (v: unknown) => JSON.stringify(v, null, 2) + "\n"

// Returns where the file went, or "" when the user cancelled the save dialog.
export async function saveFile(f: ExportFile): Promise<string> {
  const fileName = `${f.name}.${f.ext}`
  if (!isWebMode()) {
    const res = await transfer.saveFile({ file_name: fileName, ext: f.ext, content: f.content })
    return res.path
  }
  downloadBlob(fileName, new Blob([f.content], { type: f.ext === "csv" ? "text/csv" : "application/json" }))
  return fileName
}

export function downloadBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  a.click()
  // Revoking right after click() can cancel the download before the browser has read the blob.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function fromBase64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function toBase64(bytes: Uint8Array): string {
  let bin = ""
  // String.fromCharCode spreads its arguments, so large chunks would overflow the call stack.
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}
