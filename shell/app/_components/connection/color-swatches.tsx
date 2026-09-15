"use client"

import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { CONNECTION_COLORS, type ConnectionColor, isConnectionColor } from "@/lib/connection-color"

type Props = {
  value?: string
  onChange: (value: string) => void
  emptyLabel: string
}

export function ColorSwatches({ value, onChange, emptyLabel }: Props) {
  const { t } = useTranslation()
  const current = isConnectionColor(value) ? value : ""

  return (
    <div role="group" className="flex flex-wrap items-center gap-2">
      <Swatch label={emptyLabel} selected={current === ""} onSelect={() => onChange("")} className="border-muted-foreground/50 border border-dashed" />
      {(Object.keys(CONNECTION_COLORS) as ConnectionColor[]).map(color => (
        <Swatch
          key={color}
          label={t(`color_${color}`)}
          selected={current === color}
          onSelect={() => onChange(color)}
          className={CONNECTION_COLORS[color].swatch}
        />
      ))}
    </div>
  )
}

function Swatch({ label, selected, onSelect, className }: { label: string; selected: boolean; onSelect: () => void; className: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      title={label}
      onClick={onSelect}
      className={cn(
        "ring-offset-background focus-visible:ring-ring size-5 shrink-0 cursor-pointer rounded-full transition-shadow focus-visible:ring-2 focus-visible:outline-none",
        selected && "ring-foreground ring-2 ring-offset-2",
        className
      )}
    />
  )
}
