"use client"

import { useTranslation } from "react-i18next"
import { useUpdater } from "@/components/app/updater/updater.context"
import { useTheme } from "next-themes"
import { useState } from "react"
import { useAppContext } from "@/ctx/app.context"
import { useSetting } from "@/hooks/use-setting"
import { Field, FieldGroup, FieldLabel, FieldSeparator, FieldSet, FieldDescription } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { version } from "../../../package.json"

export function SettingPanelGeneral() {
  const { t } = useTranslation()
  const { checkUpdate, fullUpdate, newVersion, loading } = useUpdater()
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
    await checkUpdate({ silent: true })
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
          <Button
            className="w-full"
            size="sm"
            variant={checked && newVersion ? "default" : "outline"}
            onClick={checked && newVersion ? () => fullUpdate() : () => handleCheck()}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                {t("checking")}
              </>
            ) : checked && newVersion ? (
              t("update_now")
            ) : (
              t("check_for_updates")
            )}
          </Button>
          <FieldDescription>
            {checked ? (newVersion ? t("update_available", { v: newVersion }) : t("up_to_date")) : `${t("current_version")}: v${version}`}
          </FieldDescription>
        </Field>
      </FieldSet>
    </FieldGroup>
  )
}
