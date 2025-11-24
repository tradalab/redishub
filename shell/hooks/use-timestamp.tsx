import { useState, useEffect } from "react"

export const useTimestamp = () => {
  const [timestamp, setTimestamp] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setTimestamp(Date.now())
    }, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  return timestamp
}

export default useTimestamp
