"use client"

import type { ComponentProps } from "react"
import { useTranslation } from "react-i18next"
import { TagInput as LyraTagInput } from "@tradalab/lyra/blocks"

type Props = Pick<ComponentProps<"input">, "id" | "aria-describedby" | "aria-invalid"> & {
  value?: string[]
  onChange: (value: string[]) => void
  suggestions: string[]
  placeholder?: string
}

export function TagInput(props: Props) {
  const { t } = useTranslation()

  return <LyraTagInput {...props} removeLabel={tag => t("tag_remove", { tag })} />
}
