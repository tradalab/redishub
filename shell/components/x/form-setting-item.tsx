import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface FormSettingItemProps {
  icon?: ReactNode
  label: string
  description?: string
  children: ReactNode
  className?: string
}

export function FormSettingItem({ icon, label, description, children, className }: FormSettingItemProps) {
  return (
    <div className={cn("flex items-center justify-between rounded-md border p-4", className)}>
      <div className="flex items-center space-x-4">
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <div className="space-y-0.5">
          <div className="text-sm font-medium leading-none">{label}</div>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div>{children}</div>
    </div>
  )
}
