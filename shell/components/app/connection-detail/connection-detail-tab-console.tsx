"use client"

import React, { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import "@xterm/xterm/css/xterm.css"
import scorix from "@/lib/scorix"
import { useTranslation } from "react-i18next"
import { useTheme } from "next-themes"

const REDIS_COMMANDS = [
  "GET",
  "SET",
  "DEL",
  "EXISTS",
  "EXPIRE",
  "HGET",
  "HSET",
  "HGETALL",
  "HEXISTS",
  "LRANGE",
  "LLEN",
  "SADD",
  "SMEMBERS",
  "ZADD",
  "ZRANGE",
  "ZREM",
  "ZCARD",
  "PING",
  "INFO",
  "SCAN",
]

const XTERM_THEMES = {
  dark: {
    background: "#0a0a0a",
    foreground: "#e5e5e5",
    cursor: "#22c55e",
    selection: "#262626",

    black: "#000000",
    red: "#ef4444",
    green: "#22c55e",
    yellow: "#eab308",
    blue: "#3b82f6",
    magenta: "#a855f7",
    cyan: "#06b6d4",
    white: "#e5e5e5",
  },
  light: {
    background: "#ffffff",
    foreground: "#171717",
    cursor: "#16a34a",
    selection: "#e5e7eb",

    black: "#000000",
    red: "#dc2626",
    green: "#16a34a",
    yellow: "#ca8a04",
    blue: "#2563eb",
    magenta: "#9333ea",
    cyan: "#0891b2",
    white: "#171717",
  },
}

export function ConnectionDetailTabConsole({ connectionId, databaseIdx }: { connectionId: string; databaseIdx: number }) {
  const { t } = useTranslation()
  const { resolvedTheme } = useTheme()

  const terminalRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<any>(null)
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting")

  useEffect(() => {
    let fitAddon: any

    const history: string[] = []
    let historyIndex = -1
    let buffer = ""

    const prompt = `db${databaseIdx}> `
    const termPrompt = () => termRef.current?.write(prompt)

    const replaceInput = (text: string) => {
      // erase current buffer from terminal
      while (buffer.length > 0) {
        termRef.current.write("\b \b")
        buffer = buffer.slice(0, -1)
      }
      // write history text
      buffer = text
      termRef.current.write(text)
    }

    const getSuggestions = (buf: string) => {
      const input = buf.trim().toUpperCase()
      if (!input) return []
      return REDIS_COMMANDS.filter(cmd => cmd.startsWith(input))
    }

    const commonPrefix = (arr: string[]) => {
      if (!arr.length) return ""
      let prefix = arr[0]
      for (let i = 1; i < arr.length; i++) {
        let j = 0
        while (j < prefix.length && j < arr[i].length && prefix[j] === arr[i][j]) j++
        prefix = prefix.slice(0, j)
      }
      return prefix
    }

    const initTerminal = async () => {
      const { Terminal } = await import("@xterm/xterm")
      const { FitAddon } = await import("@xterm/addon-fit")

      const term = new Terminal({
        cursorBlink: true,
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 13,
        theme: resolvedTheme === "light" ? XTERM_THEMES.light : XTERM_THEMES.dark,
        scrollOnUserInput: true,
      })

      termRef.current = term

      fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(terminalRef.current!)
      fitAddon.fit()

      try {
        await scorix.invoke("client:console-connect", { connection_id: connectionId, database_index: databaseIdx })
        term?.writeln("\x1b[32mRedis Console Ready\x1b[0m")
        termPrompt()
        setStatus("connected")
      } catch (e) {
        const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
        term.writeln(`\x1b[31m(error)\x1b[0m ${msg}`)
        setStatus("error")
        return
      }

      term.onData((data: string) => {
        const code = data.charCodeAt(0)

        // ENTER
        if (code === 13) {
          const cmd = buffer.trim()
          term.write("\r\n")

          // store into history
          if (cmd.length > 0) {
            history.push(cmd)
            historyIndex = history.length
          }

          buffer = ""
          handleCommand(cmd)
          termPrompt()
          return
        }

        // BACKSPACE
        if (code === 127) {
          if (buffer.length > 0) {
            buffer = buffer.slice(0, -1)
            term.write("\b \b")
          }
          return
        }

        // ArrowUp
        if (code === 27 && data === "\u001b[A") {
          if (!history.length) return
          if (historyIndex > 0) historyIndex--
          replaceInput(history[historyIndex])
          return
        }

        // ArrowDown
        if (code === 27 && data === "\u001b[B") {
          if (!history.length) return
          if (historyIndex < history.length - 1) {
            historyIndex++
            replaceInput(history[historyIndex])
          } else {
            historyIndex = history.length
            replaceInput("")
          }
          return
        }

        // TAB autocomplete
        if (code === 9) {
          const suggestions = getSuggestions(buffer)
          if (!suggestions.length) return

          const prefix = commonPrefix(suggestions)
          if (prefix.length > buffer.length) {
            replaceInput(prefix + " ")
          }
          return
        }

        // normal input
        buffer += data
        term.write(data)
      })

      // auto-fit
      const handleResize = () => fitAddon.fit()
      window.addEventListener("resize", handleResize)

      return () => window.removeEventListener("resize", handleResize)
    }

    const handleCommand = async (cmd: string) => {
      if (!cmd) return
      try {
        await scorix.emit("console:input:" + connectionId, cmd)
      } catch (err: any) {
        termRef.current?.writeln(`\x1b[31m(error)\x1b[0m ${err?.message}`)
        termPrompt()
        setStatus("error")
      }
    }

    initTerminal()

    scorix.on("console:output:" + connectionId, (payload: string) => {
      termRef.current?.write("\r")
      termRef.current?.writeln(payload)
      termPrompt()
    })

    return () => {
      termRef.current?.dispose()
    }
  }, [])

  useEffect(() => {
    if (!termRef.current) return
    if (!resolvedTheme) return

    termRef.current.options.theme = resolvedTheme === "light" ? XTERM_THEMES.light : XTERM_THEMES.dark
    termRef.current.refresh(0, termRef.current.rows - 1)
  }, [resolvedTheme])

  return (
    <Card className="w-full h-full border bg-background py-2">
      <CardContent className="relative w-full h-full p-0">
        <div ref={terminalRef} className="w-full h-full px-2 pt-2" />
        <div className="absolute top-2 right-6 text-xs font-mono text-muted-foreground">Redis CLI {status === "connected" ? "🟢" : "🔴"}</div>
      </CardContent>
    </Card>
  )
}
