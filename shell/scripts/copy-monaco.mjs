import { existsSync, rmSync, cpSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const shellRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const src = resolve(shellRoot, "node_modules/monaco-editor/min/vs")
const dest = resolve(shellRoot, "public/monaco-editor/vs")

if (!existsSync(src)) {
  console.error(`[copy-monaco] source not found: ${src}\nRun \`pnpm install\` first (monaco-editor must be installed).`)
  process.exit(1)
}

rmSync(dest, { recursive: true, force: true })
mkdirSync(dirname(dest), { recursive: true })
cpSync(src, dest, { recursive: true })
console.log(`[copy-monaco] ${src} -> ${dest}`)
