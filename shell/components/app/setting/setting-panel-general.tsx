"use client"

import { useTranslation } from "react-i18next"
import { useUpdater } from "@/hooks/use-updater"
import { useTheme } from "next-themes"
import { useState } from "react"
import { useAppContext } from "@/ctx/app.context"
import { useSetting } from "@/hooks/use-setting"
import { Field, FieldGroup, FieldLabel, FieldSeparator, FieldSet } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function SettingPanelGeneral() {
  const { t } = useTranslation()
  const { checkUpdate, newVersion, loading } = useUpdater()
  const { theme, setTheme } = useTheme()
  const [checked, setChecked] = useState(false)
  const { language, setLanguage } = useAppContext()
  const [autoupdate, setAutoupdate] = useSetting("autoupdate")

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
    <FieldGroup>
      <FieldSet>
        <Field>
          <FieldLabel htmlFor="theme-select">{t("theme")}</FieldLabel>
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
        </Field>
        <Field>
          <FieldLabel htmlFor="language-select">{t("language")}</FieldLabel>
          <Select value={language ?? "en"} onValueChange={setLanguage}>
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
        </Field>
      </FieldSet>
      <FieldSeparator />
      <FieldSet>
        <Field>
          <FieldLabel>{t("auto_update")}</FieldLabel>
          <Field orientation="horizontal">
            <Checkbox
              id="autoupdate-checkbox"
              name="autoupdate-checkbox"
              checked={autoupdate == "true"}
              onCheckedChange={val => setAutoupdate(val ? "true" : "false")}
            />
            <Label htmlFor="autoupdate-checkbox" className="font-normal">
              {t("auto_check")}
            </Label>
          </Field>
        </Field>
        <Field>
          <FieldLabel>{t("check_update")}</FieldLabel>
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
        </Field>
      </FieldSet>
    </FieldGroup>
  )
}
