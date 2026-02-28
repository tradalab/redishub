"use client"

export interface ScorixAPI {
  invoke<T = any>(method: string, params?: any): Promise<T>
  emit(topic: string, data?: any): Promise<void>
  on(topic: string, callback: (data: any, error: string) => void): () => void
}

declare global {
  interface Window {
    scorix?: ScorixAPI
  }
}

const scorix: ScorixAPI = {
  invoke: (...args) => {
    if (typeof window === "undefined" || !window.scorix) {
      throw new Error("Scorix API not available")
    }
    return window.scorix.invoke(...args)
  },
  emit: (...args) => {
    if (typeof window === "undefined" || !window.scorix) return Promise.resolve()
    return window.scorix.emit(...args)
  },
  on: (...args) => {
    if (typeof window === "undefined" || !window.scorix) return () => {}
    return window.scorix.on(...args)
  },
}

export default scorix
