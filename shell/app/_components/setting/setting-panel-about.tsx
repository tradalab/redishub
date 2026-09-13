"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Field, FieldGroup, FieldLabel, FieldSet } from "@tradalab/lyra/ui"
import scorix from "@/lib/scorix"
import { isWebMode } from "@/lib/mode"

// Only the fields shown. mod:env:Info also carries appName and the OS
// dark-mode flag, which answer nothing about which build is running.
type EnvInfo = {
  platform: string
  arch: string
  appVersion: string
  locale: string
}

// The version comes from the binary, not shell/package.json: nothing bumps
// that file at release, so its number is right only by accident.
export function SettingPanelAbout() {
  const { t } = useTranslation()
  const [env, setEnv] = React.useState<EnvInfo | null>(null)
  const [failed, setFailed] = React.useState(false)
  const web = isWebMode()

  React.useEffect(() => {
    let live = true
    scorix
      .invoke<EnvInfo>("mod:env:Info", {})
      .then(info => live && setEnv(info))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [])

  return (
    <FieldGroup>
      <FieldSet>
        <Row label={t("version")}>{env?.appVersion ?? (failed ? t("unknown") : "…")}</Row>
        <Row label={t("platform")}>{env ? `${env.platform}/${env.arch}` : failed ? t("unknown") : "…"}</Row>
        <Row label={t("system_language")}>{env?.locale || (failed ? t("unknown") : "…")}</Row>
        <Row label={t("run_mode")}>{web ? t("run_mode_web") : t("run_mode_app")}</Row>
      </FieldSet>
    </FieldGroup>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Field orientation="horizontal">
      <FieldLabel className="w-40 shrink-0">{label}</FieldLabel>
      <span className="font-mono text-sm">{children}</span>
    </Field>
  )
}
