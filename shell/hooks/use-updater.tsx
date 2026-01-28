"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/kibo-ui/spinner"
import { cn } from "@/lib/utils"
import scorix from "@/lib/scorix"

export function useUpdater(autoCheck = true) {
  const [loading, setLoading] = useState(false)
  const [newVersion, setNewVersion] = useState<string | undefined>()
  const [notes, setNotes] = useState<string | undefined>()

  const checkUpdate = async () => {
    setLoading(true)
    try {
      const res: { new_version: string; notes: string } = await scorix.invoke("ext:updater:CheckForUpdate", {})
      setNewVersion(res.new_version)
      setNotes(res.notes)
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"
      if (msg !== "no update available" && !msg.includes("No connection could be made because the target machine actively refused it")) {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const fullUpdate = async () => {
    setLoading(true)
    try {
      await scorix.invoke("ext:updater:FullUpdate", {})
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const popup = () => {
    if (!newVersion || !notes) return

    toast(`New version ${newVersion} available`, {
      id: "updater",
      description: <div>{notes}</div>,
      action: (
        <div className="flex gap-2 mt-2">
          <button
            data-button="true"
            data-cancel="true"
            disabled={loading}
            className={cn("", { "!text-muted-foreground !cursor-not-allowed": loading })}
            onClick={() => toast.dismiss("updater")}
          >
            Later
          </button>
          <button
            data-button="true"
            data-action="true"
            disabled={loading}
            className={cn("", { "!text-muted-foreground !cursor-not-allowed": loading })}
            onClick={() => fullUpdate()}
          >
            {loading && <Spinner className="w-3.5 h-3.5 mr-1" />} Update
          </button>
        </div>
      ),
      duration: Infinity,
      classNames: {
        toast: "flex flex-wrap",
        content: "w-full",
        description: "whitespace-pre-line",
      },
    })
  }

  useEffect(() => {
    if (autoCheck) checkUpdate()
  }, [])

  useEffect(() => {
    popup()
  }, [loading, newVersion, notes])

  return { checkUpdate, fullUpdate, newVersion, notes, loading }
}
