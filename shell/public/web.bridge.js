(function () {
  const ScorixWebBridge = {
    _pending: new Map(),
    _events: new Map(),
    _handlers: {},
    _id: 0,
    _socket: null,
    _url: null,
    _options: {},
    _reconnectCount: 0,
    _reconnectTimer: null,
    _status: "disconnected",
    _initPromise: null,

    _setStatus(status) {
      if (this._status === status) return;
      this._status = status;
      console.debug("Scorix WebBridge: Status ->", status);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("scorix:connection:status", { detail: status }));
      }
    },

    _next_id() {
      return "web_" + ++this._id + "_" + Date.now();
    },

    async init(options = {}) {
      this._options = { ...this._options, ...options };

      if (this._socket && this._socket.readyState === WebSocket.OPEN) {
        this._setStatus("connected");
        return Promise.resolve();
      }

      if (this._initPromise) {
        return this._initPromise;
      }

      if (this._reconnectTimer) {
        clearTimeout(this._reconnectTimer);
        this._reconnectTimer = null;
      }

      this._setStatus("connecting");
      this._initPromise = new Promise((resolve, reject) => {
        this._url = this._options.url || `ws://${window.location.host}/ipc`;
        console.debug("Scorix WebBridge: Connecting to", this._url);
        this._socket = new WebSocket(this._url);

        this._socket.onopen = () => {
          this._reconnectCount = 0;
          this._setStatus("connected");
          this._initPromise = null;
          resolve();
        };

        this._socket.onerror = (err) => {
          console.error("Scorix WebBridge: Connection error", err);
          this._setStatus("disconnected");
          this._initPromise = null;
          reject(new Error("Scorix WebBridge: Connection failed (Server unreachable)"));
        };

        this._socket.onmessage = (event) => {
          this._receive(event.data);
        };

        this._socket.onclose = (e) => {
          console.debug("Scorix WebBridge: Disconnected", e.code, e.reason);
          this._socket = null;
          this._setStatus("disconnected");
          this._initPromise = null;

          if (this._pending.size > 0) {
            console.debug(`Scorix WebBridge: Rejecting ${this._pending.size} pending requests due to disconnection`);
            this._pending.forEach((p) => p.reject(new Error("Scorix WebBridge: Connection lost")));
            this._pending.clear();
          }

          this._scheduleReconnect();
        };
      });

      return this._initPromise;
    },

    _scheduleReconnect() {
      if (this._reconnectTimer) return;

      const delay = Math.min(1000 * Math.pow(2, this._reconnectCount++), 30000);
      this._setStatus("disconnected");
      console.debug(`Scorix WebBridge: Reconnecting in ${delay}ms (attempt ${this._reconnectCount})...`);

      this._reconnectTimer = setTimeout(() => {
        this._reconnectTimer = null;
        this.init().catch(() => {});
      }, delay);
    },

    async invoke(method, params, options = {}) {
      if (!this._socket || this._socket.readyState !== WebSocket.OPEN) {
        throw new Error("Scorix WebBridge: Currently offline. Reconnecting...");
      }

      const id = this._next_id();
      const envelope = { id, kind: "command", name: method, data: params, state: "start" };
      console.debug({ fn: "invoke", envelope });

      const pending = {};
      const promise = new Promise((resolve, reject) => {
        pending.resolve = resolve;
        pending.reject = reject;
        pending.onChunk = options.onChunk;
      });
      this._pending.set(id, pending);

      try {
        this._socket.send(JSON.stringify(envelope));
      } catch (err) {
        this._pending.delete(id);
        console.debug({ fn: "invoke", err });
        throw err;
      }
      return promise;
    },

    cancel(id) {
      const envelope = { id, state: "cancel" };
      this._socket?.send(JSON.stringify(envelope));
    },

    async emit(topic, data) {
      if (!this._socket || this._socket.readyState !== WebSocket.OPEN) {
        throw new Error("Scorix WebBridge: Currently offline. Reconnecting...");
      }

      const envelope = { id: this._next_id(), kind: "event", name: topic, data: data, state: "start" };
      console.debug({ fn: "emit", envelope });
      this._socket.send(JSON.stringify(envelope));
    },

    on(topic, callback) {
      if (!this._events.has(topic)) {
        this._events.set(topic, new Set());
      }
      this._events.get(topic).add(callback);
      return () => {
        this._events.get(topic)?.delete(callback);
      };
    },

    resolve(name, handler) {
      this._handlers[name] = handler;
    },

    _receive(raw) {
      try {
        const msg = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!msg) return;

        const { id, kind, name, data, state, error } = msg;

        if (id && this._pending.has(id)) {
          const pending = this._pending.get(id);
          switch (state) {
            case "received":
            case "processing":
              break;
            case "chunk":
              pending.onChunk?.(data);
              break;
            case "done":
              this._pending.delete(id);
              pending.resolve(data);
              break;
            case "error":
              this._pending.delete(id);
              pending.reject(new Error(error || "IPC Error"));
              break;
            case "cancel":
              this._pending.delete(id);
              pending.reject(new Error("Cancelled"));
              break;
          }
          return;
        }

        if (kind === "event") {
          const listeners = this._events.get(name);
          if (listeners) {
            const eventState = state || "dispatch";
            switch (eventState) {
              case "dispatch":
              case "error":
                listeners.forEach((fn) => {
                  try {
                    fn(data, error);
                  } catch (e) {
                    console.error("Scorix Event handler error:", e);
                  }
                });
                break;
            }
          }
          return;
        }

        if (kind === "resolve") {
          const handler = this._handlers[name];
          if (!handler) {
            console.warn("Scorix IPC: no handler for resolve:", name);
            return;
          }
          Promise.resolve()
            .then(() => handler(data))
            .then((result) => {
              const envelope = { id, state: "done", data: result, kind: "resolve" };
              this._socket.send(JSON.stringify(envelope));
            })
            .catch((err) => {
              const envelope = { id, state: "error", error: err?.message || String(err), kind: "resolve" };
              this._socket.send(JSON.stringify(envelope));
            });
        }
      } catch (e) {
        console.error("Scorix IPC receive error:", e);
      }
    },
  };

  if (typeof window !== "undefined") {
    window.ScorixWebBridge = ScorixWebBridge;
  }
})();
