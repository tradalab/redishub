"use client";

export interface ScorixAPI {
  invoke<T = any>(method: string, params?: any, options?: any): Promise<T>;
  emit(topic: string, data?: any): Promise<void>;
  on(topic: string, callback: (data: any, error: string) => void): () => void;
  resolve(name: string, handler: (data: any) => any): void;
  init(options?: any): Promise<void>;
}

declare global {
  interface Window {
    scorix?: ScorixAPI;
    __scorix__ipc_emit?: (msg: string) => Promise<any>;
    ScorixWebBridge?: {
      _status: "connected" | "connecting" | "disconnected";
    };
  }
}

let _cachedApi: ScorixAPI | null = null;
let _initPromise: Promise<ScorixAPI> | null = null;

async function getScorix(): Promise<ScorixAPI> {
  if (typeof window === "undefined") {
    throw new Error("Scorix is only available in the browser environment");
  }

  if (window.scorix) return window.scorix;
  if (_cachedApi) return _cachedApi;

  if (!_initPromise) {
    _initPromise = new Promise((resolve, reject) => {
      const start = Date.now();
      const interval = setInterval(() => {
        if (window.scorix) {
          clearInterval(interval);
          _cachedApi = window.scorix;
          resolve(window.scorix);
        } else if (Date.now() - start > 5000) {
          clearInterval(interval);
          reject(new Error("Scorix bridge initialization timed out. Ensure bridge scripts are included in layout.tsx"));
        }
      }, 50);
    });
  }

  return _initPromise;
}

const scorix: ScorixAPI = {
  async invoke<T = any>(method: string, params?: any, options?: any): Promise<T> {
    const api = await getScorix();
    return api.invoke(method, params, options);
  },

  async emit(topic: string, data?: any): Promise<void> {
    const api = await getScorix();
    return api.emit(topic, data);
  },

  on(topic: string, callback: (data: any, error: string) => void): () => void {
    if (typeof window === "undefined") return () => { };

    if (window.scorix) return window.scorix.on(topic, callback);

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    getScorix().then(api => {
      if (cancelled) return;
      cleanup = api.on(topic, callback);
    }).catch(console.error);

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  },

  resolve(name: string, handler: (data: any) => any): void {
    getScorix().then(api => api.resolve(name, handler)).catch(console.error);
  },

  async init(options?: any): Promise<void> {
    const api = await getScorix();
    return api.init(options);
  },
};

export default scorix;
