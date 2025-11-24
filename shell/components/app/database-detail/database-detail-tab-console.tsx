"use client"

import React, { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import "@xterm/xterm/css/xterm.css"
import scorix from "@/lib/scorix"

export function DatabaseDetailTabConsole({ databaseId, databaseIdx }: { databaseId: string; databaseIdx: number }) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting")

  useEffect(() => {
    let term: any
    let fitAddon: any

    const initTerminal = async () => {
      const { Terminal } = await import("@xterm/xterm")
      const { FitAddon } = await import("@xterm/addon-fit")

      term = new Terminal({
        cursorBlink: true,
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 13,
        theme: {
          background: "#171717",
          foreground: "#e5e5e5",
          cursor: "#22c55e",
        },
        scrollOnUserInput: true,
      })

      fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(terminalRef.current!)
      fitAddon.fit()

      try {
        await scorix.invoke("client:console-connect", { database_id: databaseId, database_index: databaseIdx })
        term.writeln("\x1b[32mRedis Console Ready\x1b[0m")
        term.writeln("Type commands like: SET name Alice, GET name")
        term.write("> ")
        setStatus("connected")
      } catch (e) {
        const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"
        term.writeln(`\x1b[31m(error)\x1b[0m ${msg}`)
        setStatus("error")
        return
      }

      let buffer = ""

      term.onData((data: string) => {
        const code = data.charCodeAt(0)
        if (code === 13) {
          handleCommand(buffer.trim())
          buffer = ""
          term.write("\r\n> ")
        } else if (code === 127) {
          // backspace
          if (buffer.length > 0) {
            buffer = buffer.slice(0, -1)
            term.write("\b \b")
          }
        } else {
          buffer += data
          term.write(data)
        }
      })

      // refit on resize
      const handleResize = () => fitAddon.fit()
      window.addEventListener("resize", handleResize)
      return () => window.removeEventListener("resize", handleResize)
    }

    const handleCommand = async (cmd: string) => {
      if (!cmd) return
      try {
        await scorix.emit("console:input:" + databaseId, cmd)
        // if (data.error) {
        //   term.writeln(`\x1b[31m(error)\x1b[0m ${data.error}`)
        // } else {
        //   term.writeln(`\x1b[36m${JSON.stringify(data.result)}\x1b[0m`)
        // }
      } catch (err: any) {
        term.writeln(`\x1b[31m(error)\x1b[0m ${err.message}`)
        setStatus("error")
      }
    }

    initTerminal()

    scorix.on("console:output:" + databaseId, (payload: string) => {
      term.writeln(`\x1b[36m${payload}\x1b[0m`)
    })

    return () => {
      term?.dispose()
    }
  }, [])

  return (
    <Card className="w-full h-full bg-neutral-900 border-neutral-800">
      <CardContent className="relative w-full h-full p-0">
        <div ref={terminalRef} className="w-full h-full px-2 pt-2" />
        <div className="absolute top-2 right-6 text-xs text-neutral-400 font-mono">Redis CLI {status === "connected" ? "🟢" : "🔴"}</div>
      </CardContent>
    </Card>
  )
}
