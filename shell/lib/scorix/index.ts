"use client"

export type ScorixResolveHandler = (params?: any) => any

const scorix = {
  _resolveHandlers: {} as Record<string, ScorixResolveHandler>,

  async invoke<T>(method: string, params?: any): Promise<T> {
    const envelope = { type: "invoke", payload: { method, params } }
    const result = await (window as any).__scorix_bind_invoke?.(JSON.stringify(envelope))
    if (result?.error) {
      throw new Error(result?.error)
    }
    return result as T
  },

  _resolve(name: string, params?: any) {
    const handler = scorix._resolveHandlers[name]
    if (!handler) return
    try {
      return handler(params)
    } catch {}
  },

  async emit(topic: string, data?: any): Promise<void> {
    const envelope = { type: "event", payload: { name: topic, data } }
    await (window as any).__scorix_bind_invoke?.(JSON.stringify(envelope))
  },

  _dispatch(data: any) {
    try {
      const msg = data as any
      const event = new CustomEvent("scorix:" + msg.payload.name, {
        detail: msg.payload.data,
      })
      window.dispatchEvent(event)
    } catch (e) {
      console.error(e)
    }
  },

  onResolve(name: string, handler: ScorixResolveHandler) {
    scorix._resolveHandlers[name] = handler
  },

  on(topic: string, callback: (data: any) => void) {
    const handler = (e: Event) => callback((e as CustomEvent).detail)
    window.addEventListener("scorix:" + topic, handler)
    return () => window.removeEventListener("scorix:" + topic, handler)
  },
}

declare global {
  interface Window {
    scorix: typeof scorix
  }
}

if (typeof window !== "undefined") {
  window.scorix = scorix
}

export default scorix
