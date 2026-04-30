"use client"

import { useCallback } from "react"
import { useRedisKeysContext } from "@/ctx/redis-keys.context"
import scorix from "@/lib/scorix"
import { toast } from "sonner"

const DEFAULT_COUNT = 10000

export function useRedisKeys(redisId: string, dbId: number = 0, keySize: number = DEFAULT_COUNT) {
  const { state, dispatch } = useRedisKeysContext()
  const dbState = state[redisId]?.[dbId] || { keys: [], cursor: null, isLoading: false, pattern: "" }

  // ////////// ////////// ////////// ////////// ////////// ////////// ////////// ////////// ////////// //////////
  // core function

  const loadKeys = useCallback(
    async (count = DEFAULT_COUNT, options: { loadAll?: boolean; reset?: boolean } = {}) => {
      if (dbState.isLoading && !options.reset) return

      dispatch({ type: "LOAD_KEYS_START", redisId, dbId })

      try {
        let cursor = options.reset ? "0" : (dbState.cursor ?? "0")
        let mergedKeys = options.reset ? [] : [...dbState.keys]
        let nextCursor: string | null = cursor
        const loadAll = options.loadAll ?? false

        do {
          const res: { keys: string[]; cursor: string } = await scorix.invoke<{ keys: string[]; cursor: string }>("key:load", {
            connection_id: redisId,
            database_index: dbId,
            cursor: nextCursor,
            count,
          })

          mergedKeys = [...mergedKeys, ...(res.keys || [])]
          nextCursor = res.cursor

          if (nextCursor === "0") {
            nextCursor = null
          }

          if (!loadAll) break
        } while (nextCursor && loadAll)

        // Ensure keys are unique
        const uniqueKeys = Array.from(new Set(mergedKeys))

        dispatch({ type: "LOAD_KEYS_SUCCESS", redisId, dbId, keys: uniqueKeys, cursor: nextCursor })
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error"
        toast.error(msg)

        dispatch({ type: "LOAD_KEYS_SUCCESS", redisId, dbId, keys: dbState.keys, cursor: null })
      }
    },
    [dbState.cursor, dbState.isLoading, dbState.keys, redisId, dbId, dispatch]
  )

  // ////////// ////////// ////////// ////////// ////////// ////////// ////////// ////////// ////////// //////////
  // public method

  const reload = useCallback(() => {
    dispatch({ type: "RESET_KEYS_BEFORE_LOAD", redisId, dbId, pattern: "*" })
    return loadKeys(keySize, { reset: true })
  }, [redisId, dbId, keySize, loadKeys, dispatch])

  const loadMore = useCallback(() => {
    if (!dbState.cursor) return
    return loadKeys(keySize, { loadAll: false })
  }, [dbState.cursor, keySize, loadKeys])

  const loadAll = useCallback(() => {
    if (!dbState.cursor) return
    return loadKeys(keySize, { loadAll: true })
  }, [dbState.cursor, keySize, loadKeys])

  // ////////// ////////// ////////// ////////// ////////// ////////// ////////// ////////// ////////// //////////
  // update

  const updateKey = async (oldKey: string, newKey: string) => {
    try {
      await scorix.invoke("client:key-name-update", { connection_id: redisId, database_index: dbId, current_name: oldKey, new_name: newKey })
      dispatch({ type: "UPDATE_KEY", redisId, dbId, oldKey, newKey })
      toast.success("Updated!")
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"
      toast.error(msg)
    }
  }

  const addKey = async (key: string, values: any) => {
    try {
      await scorix.invoke("client:key-create", { connection_id: redisId, database_index: dbId, ...values })
      dispatch({ type: "ADD_KEY", redisId, dbId, key })
      toast.success("Created!")
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"
      toast.error(msg)
    }
  }

  const deleteKey = async (key: string) => {
    try {
      await scorix.invoke("client:key-delete", { connection_id: redisId, database_index: dbId, key: key })
      dispatch({ type: "DELETE_KEY", redisId, dbId, key })
      toast.success("Deleted!")
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"
      toast.error(msg)
    }
  }

  const scanByPrefix = async (prefix: string, cursor: number = 0, limit: number = 1000) => {
    try {
      const res = await scorix.invoke<{ keys: string[]; next_cursor: number }>("client:keys-scan-by-prefix", {
        connection_id: redisId,
        database_index: dbId,
        prefix,
        cursor,
        limit,
      })
      return { keys: res.keys || [], nextCursor: res.next_cursor }
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"
      toast.error(msg)
      return { keys: [], nextCursor: 0 }
    }
  }

  const deleteByPrefix = async (prefix: string, keys?: string[]) => {
    const toastId = toast.loading(`Deleting keys...`)
    try {
      let cleanup = () => { }
      if (!keys || keys.length === 0) {
        cleanup = scorix.on(`client:keys-delete-progress:${redisId}`, (data: any) => {
          if (data.prefix === prefix) {
            toast.loading(`Deleting keys with prefix: ${prefix}... (${data.deleted} deleted)`, { id: toastId })
          }
        })
      }

      await scorix.invoke("client:keys-delete-by-prefix", {
        connection_id: redisId,
        database_index: dbId,
        prefix: prefix,
        keys: keys || [],
      })

      cleanup()

      if (keys && keys.length > 0) {
        dispatch({ type: "DELETE_KEYS", redisId, dbId, keys })
      } else {
        dispatch({ type: "DELETE_BY_PREFIX", redisId, dbId, prefix })
      }

      toast.success(`Successfully deleted keys`, { id: toastId })
      reload()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"
      toast.error(msg, { id: toastId })
    }
  }

  return {
    keys: dbState.keys,
    cursor: dbState.cursor,
    isLoading: dbState.isLoading,

    // public actions
    reload,
    loadMore,
    loadAll,

    updateKey,
    addKey,
    deleteKey,
    deleteByPrefix,
    scanByPrefix,
  }
}
