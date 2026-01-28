"use client"

import { ReactNode, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTheme } from "next-themes"
import { version } from "../../../package.json"
import { Button } from "@/components/ui/button"
import { useUpdater } from "@/hooks/use-updater"
import { Spinner } from "@/components/ui/spinner"
import scorix from "@/lib/scorix"
import { useTranslation } from "react-i18next"
import { Panel } from "@/components/ui/trada-ui/panel"
import { useSetting } from "@/hooks/use-setting"
import i18n from "@/i18n"

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
              content: <PanelGeneral />,
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

function PanelGeneral() {
  const { t } = useTranslation()
  const { checkUpdate, newVersion, loading } = useUpdater(false)
  const { theme, setTheme } = useTheme()
  const [checked, setChecked] = useState(false)
  const [language, setLanguage] = useSetting("language")

  const languages = [
    { value: "en", label: "🇺🇸 English" },
    { value: "ja", label: "🇯🇵 日本語" },
  ] as const

  const handleCheck = async () => {
    setChecked(false)
    await checkUpdate()
    setChecked(true)
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="theme-select">{t("theme")}</Label>
        <Select value={theme} onValueChange={setTheme}>
          <SelectTrigger id="theme-select" className="w-full">
            <SelectValue placeholder="Select Theme" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="system">{t("system")}</SelectItem>
              <SelectItem value="light">{t("light")}</SelectItem>
              <SelectItem value="dark">{t("dark")}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="language-select">{t("language")}</Label>
        <Select value={language ?? "en"} onValueChange={val => setLanguage(val).then(() => i18n.changeLanguage(val))}>
          <SelectTrigger id="language-select" className="w-full">
            <SelectValue placeholder="" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {languages.map(language => (
                <SelectItem key={language.value} value={language.value}>
                  {language.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>{t("check_update")}</Label>
        <div className="flex items-center gap-2">
          <Button className="w-full" size="sm" variant="outline" onClick={handleCheck}>
            {loading ? (
              <>
                <Spinner /> {t("checking")}
              </>
            ) : checked ? (
              newVersion ? (
                `⬆️ ${t("update_available", { v: newVersion })}`
              ) : (
                `✅ ${t("up_to_date")}`
              )
            ) : (
              t("check_update")
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
