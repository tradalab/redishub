"use client"

import { useId, useState, type ComponentProps, type KeyboardEvent } from "react"
import { useTranslation } from "react-i18next"
import { XIcon } from "lucide-react"
import { Badge } from "@tradalab/lyra/ui"
import { cn } from "@/lib/utils"
import { addTag } from "@/lib/connection-tree"

type Props = Pick<ComponentProps<"input">, "id" | "aria-describedby" | "aria-invalid"> & {
  value?: string[]
  onChange: (value: string[]) => void
  suggestions: string[]
  placeholder?: string
}

export function TagInput({ value, onChange, suggestions, placeholder, ...aria }: Props) {
  const { t } = useTranslation()
  const listId = useId()
  const [draft, setDraft] = useState("")
  const tags = value ?? []

  const commit = () => {
    const next = draft.split(",").reduce(addTag, tags)
    if (next !== tags) onChange(next)
    setDraft("")
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      commit()
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div
      className={cn(
        "border-input dark:bg-input/30 flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border bg-transparent px-2 py-1 text-sm shadow-xs",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]"
      )}
    >
      {tags.map(tag => (
        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
          {tag}
          <button
            type="button"
            aria-label={t("tag_remove", { tag })}
            className="hover:text-foreground text-muted-foreground"
            onClick={() => onChange(tags.filter(x => x !== tag))}
          >
            <XIcon className="size-3" />
          </button>
        </Badge>
      ))}
      <input
        {...aria}
        value={draft}
        list={listId}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        placeholder={tags.length === 0 ? placeholder : undefined}
        className="placeholder:text-muted-foreground min-w-24 flex-1 bg-transparent outline-none"
      />
      <datalist id={listId}>
        {suggestions
          .filter(s => !tags.some(x => x.toLowerCase() === s.toLowerCase()))
          .map(s => (
            <option key={s} value={s} />
          ))}
      </datalist>
    </div>
  )
}
