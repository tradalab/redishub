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
      console.log("loadKeys")

      dispatch({ type: "LOAD_KEYS_START", redisId, dbId })

      try {
        let cursor = dbState.cursor ?? "0"
        let mergedKeys = loadAll ? [...dbState.keys] : [...dbState.keys]
        let nextCursor: string | null = cursor

        do {
          const res: { keys: string[]; cursor: string } = await scorix.invoke<{
            keys: string[]
            cursor: string
          }>("key:load", {
            database_id: redisId,
            database_index: dbId,
            cursor: nextCursor,
            count,
          })

          mergedKeys = [...mergedKeys, ...res.keys]
          nextCursor = res.cursor

          console.log("res.cursor", { nextCursor, loadAll, keys: res.keys.length })

          if (nextCursor === "0") {
            console.log("set new next cursor: ", nextCursor)
            nextCursor = null
          }

          if (!loadAll) break
        } while (nextCursor && loadAll)
        console.log("load key successfully")
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
    console.log("reload")
    dispatch({ type: "RESET_KEYS_BEFORE_LOAD", redisId, dbId, pattern: "*" })
    return loadKeys(DEFAULT_COUNT, false)
  }, [redisId, dbId, loadKeys, dispatch])

  const loadMore = useCallback(() => {
    console.log("loadMore")
    if (!dbState.cursor) return
    return loadKeys(DEFAULT_COUNT, false)
  }, [dbState.cursor, loadKeys])

  const loadAll = useCallback(() => {
    console.log("loadAll")
    if (!dbState.cursor) return
    return loadKeys(DEFAULT_COUNT, true)
  }, [loadKeys])

  // ////////// ////////// ////////// ////////// ////////// ////////// ////////// ////////// ////////// //////////
  // update

  const updateKey = (oldKey: string, newKey: string) => {
    dispatch({ type: "UPDATE_KEY", redisId, dbId, oldKey, newKey })
  }

  const addKey = (key: string) => {
    dispatch({ type: "ADD_KEY", redisId, dbId, key })
  }

  const deleteKey = (key: string) => {
    dispatch({ type: "DELETE_KEY", redisId, dbId, key })
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
