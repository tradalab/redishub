import {DependencyList, useEffect} from "react"
import { debounce } from "lodash"

type Callback = () => void

export const useDebouncedEffect = (
  callback: Callback,
  deps: DependencyList,
  delay: number = 500
): void => {
  useEffect(() => {
    const handler = debounce(callback, delay)
    handler()

    return () => {
      handler.cancel()
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
}
