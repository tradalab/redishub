;(function () {
  const ScorixAppBridge = {
    _pending: new Map(), // id -> { resolve, reject, onChunk }
    _events: new Map(),
    _handlers: {},
    _id: 0,

    _next_id() {
      return "app_" + ++this._id + "_" + Date.now()
    },

    async init() {
      console.debug("Scorix AppBridge: Initialized")
      return Promise.resolve()
    },

    async invoke(method, params, options = {}) {
      const id = this._next_id()
      const envelope = { id, kind: "command", name: method, data: params, state: "start" }
      console.debug({ fn: "invoke", envelope })
      const pending = {}
      const promise = new Promise((resolve, reject) => {
        pending.resolve = resolve
        pending.reject = reject
        pending.onChunk = options.onChunk
      })
      this._pending.set(id, pending)
      try {
        // JS -> Go binding
        const resultRaw = await window.__scorix__ipc_emit?.(JSON.stringify(envelope))
        const result = typeof resultRaw === "string" ? JSON.parse(resultRaw) : resultRaw
        console.debug({ fn: "invoke", result })
        if (result && result.state === "error") {
          throw new Error(result.error)
        }
        if (!result || result.state !== "received") {
          throw new Error("IPC protocol error: expected state=received")
        }
      } catch (err) {
        this._pending.delete(id)
        console.debug({ fn: "invoke", err })
        throw err
      }
      return promise
    },

    cancel(id) {
      const envelope = { id, state: "cancel" }
      window.__scorix__ipc_emit?.(JSON.stringify(envelope))
    },

    async emit(topic, data) {
      const envelope = { id: this._next_id(), kind: "event", name: topic, data: data, state: "start" }
      console.debug({ fn: "emit", envelope })
      await window?.__scorix__ipc_emit?.(JSON.stringify(envelope))
    },

    on(topic, callback) {
      if (!this._events.has(topic)) {
        this._events.set(topic, new Set())
      }
      this._events.get(topic).add(callback)
      return () => {
        this._events.get(topic)?.delete(callback)
      }
    },

    resolve(name, handler) {
      this._handlers[name] = handler
    },

    _receive(raw) {
      try {
        const msg = typeof raw === "string" ? JSON.parse(raw) : raw
        if (!msg) return
        const { id, kind, name, data, state, error } = msg
        console.debug("Scorix IPC Receive:", { id, kind, name, state })

        // ----- lifecycle for invoke -----
        if (id && this._pending.has(id)) {
          const pending = this._pending.get(id)
          switch (state) {
            case "received":
            case "processing":
              break
            case "chunk":
              pending.onChunk?.(data)
              break
            case "done":
              this._pending.delete(id)
              pending.resolve(data)
              break
            case "error":
              this._pending.delete(id)
              pending.reject(new Error(error || "IPC Error"))
              break
            case "cancel":
              this._pending.delete(id)
              pending.reject(new Error("Cancelled"))
              break
          }
          return
        }

        // ----- event -----
        if (kind === "event") {
          const listeners = this._events.get(name)
          if (listeners) {
            const eventState = state || "dispatch"
            switch (eventState) {
              case "dispatch":
              case "error":
                listeners.forEach(fn => {
                  try {
                    fn(data, error)
                  } catch (e) {
                    console.error("Scorix Event handler error:", e)
                  }
                })
                break
            }
          }
          return
        }

        // ----- Go calls JS -----
        if (kind === "resolve") {
          const handler = this._handlers[name]
          if (!handler) {
            console.warn("Scorix IPC: no handler for resolve:", name)
            return
          }
          Promise.resolve()
            .then(() => handler(data))
            .then(result => {
              const envelope = { id, state: "done", data: result }
              window.__scorix__ipc_emit?.(JSON.stringify(envelope))
            })
            .catch(err => {
              const envelope = { id, state: "error", error: err?.message || String(err) }
              window.__scorix__ipc_emit?.(JSON.stringify(envelope))
            })
        }
      } catch (e) {
        console.error("Scorix IPC receive error:", e)
      }
    },
  }

  if (typeof window !== "undefined") {
    window.ScorixAppBridge = ScorixAppBridge
    window.__scorix__ipc_receive = msg => ScorixAppBridge._receive(msg)
    window.__scorix__ipc_resolve = msg => ScorixAppBridge._receive(msg)
  }
})()
