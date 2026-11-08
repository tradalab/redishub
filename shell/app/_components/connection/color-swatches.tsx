"use client"

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { ColorSwatches as LyraColorSwatches } from "@tradalab/lyra/blocks"
import { CONNECTION_COLOR_NAMES } from "@tradalab/lyra/utils"

type Props = {
  value?: string
  onChange: (value: string) => void
  emptyLabel: string
}

export function ColorSwatches({ value, onChange, emptyLabel }: Props) {
  const { t } = useTranslation()
  const labels = useMemo(() => Object.fromEntries(CONNECTION_COLOR_NAMES.map(c => [c, t(`color_${c}`)])), [t])

  return <LyraColorSwatches value={value} onChange={onChange} emptyLabel={emptyLabel} labels={labels} />
}
