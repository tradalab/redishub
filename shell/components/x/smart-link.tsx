import Link from "next/link"
import React from "react"

type SmartLinkProps = {
  href: string
  children: React.ReactNode
  className?: string
}

export const SmartLink = ({ href, children, className }: SmartLinkProps) => {
  const isExternal = href.startsWith("http")

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    )
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}
