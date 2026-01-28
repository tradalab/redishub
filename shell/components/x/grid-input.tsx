import { ComponentPropsWithoutRef, forwardRef } from "react"
import { cn } from "@/lib/utils"

export const GridInput = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      {...props}
      autoComplete="off"
      className={cn(
        "txt-compact-small text-ui-fg-base placeholder:text-ui-fg-muted disabled:text-ui-fg-disabled disabled:bg-ui-bg-base bg-transparent px-2 py-1.5 outline-none",
        className
      )}
    />
  )
})
GridInput.displayName = "GridInput"
