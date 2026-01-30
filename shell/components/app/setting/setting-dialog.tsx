"use client"

import { ReactNode } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { version } from "../../../package.json"
import scorix from "@/lib/scorix"
import { useTranslation } from "react-i18next"
import { Panel } from "@/components/ui/trada-ui/panel"
import { SettingPanelGeneral } from "./setting-panel-general"

export function SettingDialog({ children }: { children: ReactNode }) {
  const { t } = useTranslation()

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[700px] space-y-4">
        <DialogHeader>
          <DialogTitle>{t("settings")}</DialogTitle>
        </DialogHeader>
        <Panel
          items={[
            {
              key: "general",
              label: t("general"),
              content: <SettingPanelGeneral />,
            },
          ]}
        />
        <DialogFooter>
          <div className="flex items-center justify-between w-full text-sm">
            <div className="flex gap-4">
              <a
                href="#"
                onClick={e => {
                  e.preventDefault()
                  scorix.invoke("ext:browser:OpenUrl", "https://github.com/tradalab/redishub")
                }}
                className="text-blue-500 underline"
              >
                GitHub
              </a>
              <a
                href="#"
                onClick={e => {
                  e.preventDefault()
                  scorix.invoke("ext:browser:OpenUrl", "https://github.com/tradalab/redishub/issues")
                }}
                className="text-blue-500 underline"
              >
                {t("report_issues")}
              </a>
            </div>
            <span className="font-bold">v{version}</span>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
