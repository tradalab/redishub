import { cn } from "@/lib/utils"
import React from "react"

type MaxWidth = "sm" | "md" | "lg" | "xl" | "2xl" | false
type Center = "x" | "y" | "both"

interface ContainerProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType
  maxWidth?: MaxWidth
  fluid?: boolean
  center?: Center
  fullHeight?: boolean // Thêm tùy chọn full height nếu muốn center theo chiều dọc
}

const maxWidthMap: Record<Exclude<MaxWidth, false>, string> = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-screen-2xl",
}

export function Container({
  as: Component = "div",
  maxWidth = "xl",
  fluid = false,
  center,
  fullHeight = false,
  className,
  children,
  ...props
}: ContainerProps) {
  const widthClass = !fluid && maxWidth ? maxWidthMap[maxWidth] : "max-w-none"

  const baseClasses = ["w-full", "px-4", "sm:px-6", "lg:px-8", !fluid && widthClass]

  const centerClasses =
    center === "x"
      ? "mx-auto"
      : center === "y"
        ? "flex flex-col justify-center" + (fullHeight ? " min-h-screen" : "")
        : center === "both"
          ? "flex items-center justify-center" + (fullHeight ? " min-h-screen" : "")
          : ""

  return (
    <Component className={cn(baseClasses, centerClasses, className)} {...props}>
      {children}
    </Component>
  )
}
