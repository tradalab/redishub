import { create } from "zustand"
import scorix from "@/lib/scorix"
import { parseRedisInfo } from "@/lib/utils"

export type InfoObject = Record<string, Record<string, any>>

interface ConnectionInfo {
  info: InfoObject
  lastUpdated: Date
  loading: boolean
}

interface AutoRefreshConfig {
  enabled: boolean
  interval: number // in ms
  timerId?: any
}

interface ConnectionInfoState {
  infos: Record<string, ConnectionInfo>
  autoRefreshConfigs: Record<string, AutoRefreshConfig>

  fetchInfo: (connectionId: string, databaseIdx: number, force?: boolean) => Promise<void>
  toggleAutoRefresh: (connectionId: string, databaseIdx: number, enabled: boolean, interval?: number) => void
  clearInfo: (connectionId: string) => void
  cleanup: () => void
}

const DEFAULT_INTERVAL = 10000 // 10 seconds

export const useConnectionInfoStore = create<ConnectionInfoState>((set, get) => ({
  infos: {},
  autoRefreshConfigs: {},

  fetchInfo: async (connectionId, databaseIdx, force = false) => {
    const key = `${connectionId}:${databaseIdx}`
    const state = get()
    const currentInfo = state.infos[key]

    // If not forced and already loading or has data, skip (unless data is very old, but we rely on force/auto-refresh)
    if (!force && currentInfo && (currentInfo.loading || currentInfo.info)) {
      return
    }

    set(state => ({
      infos: {
        ...state.infos,
        [key]: {
          ...(state.infos[key] || { info: {}, lastUpdated: new Date() }),
          loading: true,
        },
      },
    }))

    try {
      const res = await scorix.invoke<{ info: string; total_db: number }>("client:general", {
        connection_id: connectionId,
        database_index: databaseIdx,
      })
      const parsedInfo = parseRedisInfo(res.info) as InfoObject

      set(state => ({
        infos: {
          ...state.infos,
          [key]: {
            info: parsedInfo,
            lastUpdated: new Date(),
            loading: false,
          },
        },
      }))
    } catch (e) {
      set(state => ({
        infos: {
          ...state.infos,
          [key]: {
            ...(state.infos[key] || { info: {}, lastUpdated: new Date() }),
            loading: false,
          },
        },
      }))
      throw e
    }
  },

  toggleAutoRefresh: (connectionId, databaseIdx, enabled, interval = DEFAULT_INTERVAL) => {
    const key = `${connectionId}:${databaseIdx}`
    const { autoRefreshConfigs, fetchInfo } = get()
    const currentConfig = autoRefreshConfigs[key]

    // Clear existing timer if any
    if (currentConfig?.timerId) {
      clearInterval(currentConfig.timerId)
    }

    if (enabled) {
      const timerId = setInterval(() => {
        fetchInfo(connectionId, databaseIdx, true).catch(() => {
          // Silent error for auto-refresh
        })
      }, interval)

      set(state => ({
        autoRefreshConfigs: {
          ...state.autoRefreshConfigs,
          [key]: { enabled, interval, timerId },
        },
      }))

      // Trigger immediate fetch if enabled
      fetchInfo(connectionId, databaseIdx, true).catch(() => { })
    } else {
      set(state => ({
        autoRefreshConfigs: {
          ...state.autoRefreshConfigs,
          [key]: { enabled, interval, timerId: undefined },
        },
      }))
    }
  },

  clearInfo: (connectionId) => {
    // Clear all DB infos for this connection
    set(state => {
      const newInfos = { ...state.infos }
      const newConfigs = { ...state.autoRefreshConfigs }

      Object.keys(newInfos).forEach(key => {
        if (key.startsWith(`${connectionId}:`)) {
          delete newInfos[key]
        }
      })

      Object.keys(newConfigs).forEach(key => {
        if (key.startsWith(`${connectionId}:`)) {
          if (newConfigs[key].timerId) {
            clearInterval(newConfigs[key].timerId)
          }
          delete newConfigs[key]
        }
      })

      return { infos: newInfos, autoRefreshConfigs: newConfigs }
    })
  },

  cleanup: () => {
    const { autoRefreshConfigs } = get()
    Object.values(autoRefreshConfigs).forEach(config => {
      if (config.timerId) {
        clearInterval(config.timerId)
      }
    })
    set({ infos: {}, autoRefreshConfigs: {} })
  }
}))
