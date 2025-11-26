"use client"

import React, { createContext, useContext, useReducer } from "react"

type DBKeyState = {
  keys: string[]
  cursor: string | null
  isLoading: boolean
  pattern: string
}

type KeyState = {
  [redisId: string]: {
    [dbId: number]: DBKeyState
  }
}

type Action =
  | { type: "RESET_KEYS_BEFORE_LOAD"; redisId: string; dbId: number; pattern: string }
  | { type: "LOAD_KEYS_START"; redisId: string; dbId: number }
  | { type: "LOAD_KEYS_SUCCESS"; redisId: string; dbId: number; keys: string[]; cursor: string | null }
  | { type: "UPDATE_KEY"; redisId: string; dbId: number; oldKey: string; newKey: string }
  | { type: "ADD_KEY"; redisId: string; dbId: number; key: string }
  | { type: "DELETE_KEY"; redisId: string; dbId: number; key: string }

const createDBState = (): DBKeyState => ({
  keys: [],
  cursor: null,
  isLoading: false,
  pattern: "",
})

const initialState: KeyState = {}

function redisKeysReducer(state: KeyState, action: Action): KeyState {
  const { redisId, dbId } = action
  const currentRedis = state[redisId] || {}
  const dbState = currentRedis[dbId] || createDBState()

  switch (action.type) {
    case "RESET_KEYS_BEFORE_LOAD":
      return {
        ...state,
        [redisId]: {
          ...currentRedis,
          [dbId]: {
            ...createDBState(),
            pattern: action.pattern,
            isLoading: true,
          },
        },
      }

    case "LOAD_KEYS_START":
      return {
        ...state,
        [redisId]: {
          ...currentRedis,
          [dbId]: {
            ...dbState,
            isLoading: true,
          },
        },
      }

    case "LOAD_KEYS_SUCCESS": {
      const combined = [...dbState.keys, ...action.keys]
      const unique = Array.from(new Set(combined))

      return {
        ...state,
        [redisId]: {
          ...currentRedis,
          [dbId]: {
            ...dbState,
            keys: unique,
            cursor: action.cursor,
            isLoading: false,
          },
        },
      }
    }

    case "UPDATE_KEY":
      return {
        ...state,
        [redisId]: {
          ...currentRedis,
          [dbId]: {
            ...dbState,
            keys: dbState.keys.map(k => (k === action.oldKey ? action.newKey : k)),
          },
        },
      }

    case "ADD_KEY":
      return {
        ...state,
        [redisId]: {
          ...currentRedis,
          [dbId]: {
            ...dbState,
            keys: [action.key, ...dbState.keys],
          },
        },
      }

    case "DELETE_KEY":
      return {
        ...state,
        [redisId]: {
          ...currentRedis,
          [dbId]: {
            ...dbState,
            keys: dbState.keys.filter(k => k !== action.key),
          },
        },
      }

    default:
      return state
  }
}

const RedisKeysContext = createContext<{
  state: KeyState
  dispatch: React.Dispatch<Action>
} | null>(null)

export const RedisKeysProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(redisKeysReducer, initialState)
  return <RedisKeysContext.Provider value={{ state, dispatch }}>{children}</RedisKeysContext.Provider>
}

export function useRedisKeysContext() {
  const ctx = useContext(RedisKeysContext)
  if (!ctx) throw new Error("useRedisKeysContext must be used inside provider")
  return ctx
}
