"use client"

import { useCallback } from "react"
import { useRedisKeysContext } from "@/ctx/redis-keys.context"
import scorix from "@/lib/scorix"
import { toast } from "sonner"

const DEFAULT_COUNT = 1000

export function useRedisKeys(redisId: string, dbId: number = 0) {
  const { state, dispatch } = useRedisKeysContext()
  const dbState = state[redisId]?.[dbId] || { keys: [], cursor: null, isLoading: false, pattern: "" }

  // ////////// ////////// ////////// ////////// ////////// ////////// ////////// ////////// ////////// //////////
  // core function

  const loadKeys = useCallback(
    async (count = DEFAULT_COUNT, loadAll = false) => {
      if (dbState.isLoading) return

      dispatch({ type: "LOAD_KEYS_START", redisId, dbId })

      try {
        let cursor = dbState.cursor ?? "0"
        let mergedKeys = loadAll ? [...dbState.keys] : [...dbState.keys]
        let nextCursor: string | null = cursor

        do {
          const res: { keys: string[]; cursor: string } = await scorix.invoke<{ keys: string[]; cursor: string }>("key:load", {
            connection_id: redisId,
            database_index: dbId,
            cursor: nextCursor,
            count,
          })

          mergedKeys = [...mergedKeys, ...res.keys]
          nextCursor = res.cursor

          if (nextCursor === "0") {
            nextCursor = null
          }

          if (!loadAll) break
        } while (nextCursor && loadAll)
        dispatch({ type: "LOAD_KEYS_SUCCESS", redisId, dbId, keys: mergedKeys, cursor: nextCursor })
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
    return loadKeys(DEFAULT_COUNT, false)
  }, [redisId, dbId, loadKeys, dispatch])

  const loadMore = useCallback(() => {
    if (!dbState.cursor) return
    return loadKeys(DEFAULT_COUNT, false)
  }, [dbState.cursor, loadKeys])

  const loadAll = useCallback(() => {
    if (!dbState.cursor) return
    return loadKeys(DEFAULT_COUNT, true)
  }, [loadKeys])

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
  }
}
