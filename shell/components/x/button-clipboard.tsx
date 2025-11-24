"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckIcon, ClipboardCopyIcon } from "lucide-react"

interface ButtonCopyProps {
  value: string
  copyLabel?: string
  copiedLabel?: string
  size?: "sm" | "default" | "lg"
  variant?: "ghost" | "default" | "outline"
}

export function ButtonClipboardCopy({ value, size = "sm", variant = "ghost", copiedLabel = "Copied", copyLabel = "Copy" }: ButtonCopyProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={handleCopy}>
      {copied ? (
        <>
          <CheckIcon className="w-4 h-4 mr-1" /> {copiedLabel}
        </>
      ) : (
        <>
          <ClipboardCopyIcon className="w-4 h-4 mr-1" /> {copyLabel}
        </>
      )}
    </Button>
  )
}
