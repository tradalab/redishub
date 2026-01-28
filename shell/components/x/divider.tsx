import React from "react"

type DividerProps = {
  label?: React.ReactNode
  className?: string
  labelClassName?: string
}

export function Divider({ label, className = "", labelClassName = "" }: DividerProps) {
  return (
    <div className={`flex items-center w-full ${className}`}>
      <div className="flex-grow border-t border-border" />
      {label && <span className={`mx-4 text-sm text-muted-foreground whitespace-nowrap ${labelClassName}`}>{label}</span>}
      {label && <div className="flex-grow border-t border-border" />}
    </div>
  )
}
