import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function useIsDarkMode() {
  const { resolvedTheme } = useTheme()
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    if (resolvedTheme === "dark") {
      setIsDarkMode(true)
    } else {
      setIsDarkMode(false)
    }
  }, [resolvedTheme])

  return isDarkMode
}
