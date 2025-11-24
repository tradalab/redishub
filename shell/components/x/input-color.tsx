"use client"

import { useState } from "react"
import { RgbaColorPicker, RgbaColor } from "react-colorful"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

function rgbaToHex({ r, g, b }: RgbaColor): string {
  return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")
}

function hexToRgba(hex: string): RgbaColor {
  const clean = hex.replace("#", "")
  const bigint = parseInt(clean, 16)
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
    a: 1,
  }
}

interface ColorDisplayPickerProps {
  defaultColor?: string
  onChange?: (hex: string) => void
  className?: string
}

export function InputColor({ defaultColor = "#FFFFFF", onChange, className }: ColorDisplayPickerProps) {
  const [rgba, setRgba] = useState<RgbaColor>(hexToRgba(defaultColor))

  const handleChange = (newColor: RgbaColor) => {
    setRgba(newColor)
    onChange?.(rgbaToHex(newColor))
  }

  const hex = rgbaToHex(rgba)?.toUpperCase()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className={cn("flex items-center border rounded px-1 py-1 w-fit cursor-pointer text-sm gap-2", className)}>
          <div className="w-6 h-6 rounded-sm border shadow-inner" style={{ backgroundColor: hex }} />
          <span>{hex}</span>
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-3">
        <RgbaColorPicker color={rgba} onChange={handleChange} />
      </PopoverContent>
    </Popover>
  )
}
