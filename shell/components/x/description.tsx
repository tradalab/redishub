import { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface DescriptionItem {
  label: string
  content: ReactNode
  span?: number
}

interface DescriptionsProps {
  items: DescriptionItem[]
  columns?: number
  bordered?: boolean
  colon?: boolean
  labelAlign?: "left" | "right"
  className?: string
}

export function Descriptions({ items, columns = 3, bordered = false, colon = true, labelAlign = "left", className }: DescriptionsProps) {
  return (
    <div className={cn(`grid gap-4 sm:grid-cols-${columns}`, className)}>
      {items.map((item, index) => (
        <div key={index} className={cn(`col-span-${item.span ?? 1}`, bordered && "border rounded-lg p-4", "flex flex-col sm:flex-row gap-1 sm:gap-2")}>
          <div className={cn("text-sm font-medium text-muted-foreground whitespace-nowrap", labelAlign === "right" ? "sm:text-right" : "sm:text-left")}>
            {item.label}
            {colon && ":"}
          </div>
          <div className="text-sm text-foreground flex-1">{item.content}</div>
        </div>
      ))}
    </div>
  )
}
