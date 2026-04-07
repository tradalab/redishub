"use client"

import { ReactNode, useEffect, useState, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import scorix from "@/lib/scorix"
import { cn } from "@/lib/utils"
import { useSetting } from "@/hooks/use-setting"
import { Spinner } from "@/components/ui/spinner"
import { UpdaterContext } from "./updater.context"

export const UpdaterProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [newVersion, setNewVersion] = useState<string | undefined>()
  const [notes, setNotes] = useState<string | undefined>()
  const [autoupdate] = useSetting("autoupdate")
  const [lastCheck, setLastCheck] = useSetting("last_update_check", { silent: true })

  const checkUpdate = useCallback(
    async (options?: { silent?: boolean }) => {
      setLoading(true)
      try {
        const res: { new_version: string; notes: string } = await scorix.invoke("mod:updater:CheckForUpdate", {})
        setNewVersion(res.new_version)
        setNotes(res.notes)
        await setLastCheck(Date.now().toString())
        return res
      } catch (e: any) {
        const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "unknown_error"
        const isNoUpdate = msg === "no update available"

        if (!options?.silent && !isNoUpdate && !msg.includes("No connection could be made because the target machine actively refused it")) {
          toast.error(t(msg as any, { defaultValue: msg }))
        }

        if (isNoUpdate) {
          await setLastCheck(Date.now().toString())
        }
        return null
      } finally {
        setLoading(false)
      }
    },
    [setLastCheck, t]
  )

  const fullUpdate = useCallback(async () => {
    setLoading(true)
    try {
      const info: { platform: string } = await scorix.invoke("system:info", {})
      if (info.platform === "linux" || info.platform === "darwin") {
        await scorix.invoke("mod:browser:OpenUrl", { url: "https://github.com/tradalab/redishub/releases" })
        return
      }
      await scorix.invoke("mod:updater:FullUpdate", {})
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "unknown_error"
      toast.error(t(msg as any, { defaultValue: msg }))
    } finally {
      setLoading(false)
    }
  }, [t])

  const popup = useCallback(() => {
    if (!newVersion || !notes) return

    toast(t("update_available", { v: newVersion }), {
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
            {t("later")}
          </button>
          <button
            data-button="true"
            data-action="true"
            disabled={loading}
            className={cn("", { "!text-muted-foreground !cursor-not-allowed": loading })}
            onClick={() => fullUpdate()}
          >
            {loading && <Spinner />} {t("update")}
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
  }, [newVersion, notes, t, loading, fullUpdate])

  useEffect(() => {
    if (autoupdate === "false") return

    const last = parseInt(lastCheck || "0")
    const now = Date.now()
    if (now - last < 24 * 60 * 60 * 1000) return

    checkUpdate({ silent: true }).then(res => {
      if (res) {
        popup()
      }
    })
  }, [autoupdate, lastCheck, checkUpdate, popup])

  return <UpdaterContext.Provider value={{ loading, newVersion, notes, checkUpdate, fullUpdate, popup }}>{children}</UpdaterContext.Provider>
}
