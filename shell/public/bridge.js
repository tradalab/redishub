(function () {
  const orchestrator = {
    _bridge: null,
    _initPromise: null,

    async init(options = {}) {
      if (!this._initPromise) {
        this._initPromise = (async () => {
          if (window.__scorix__ipc_emit) {
            console.debug("Scorix: App Mode detected (WebView)");
            this._bridge = window.ScorixAppBridge;
          } else {
            console.debug("Scorix: Web Mode detected (WebSocket)");
            this._bridge = window.ScorixWebBridge;
          }
        })();
      }

      await this._initPromise;

      if (this._bridge && typeof this._bridge.init === "function") {
        return this._bridge.init(options);
      }
    },

    async _call(fn, ...args) {
      await this.init();
      if (!this._bridge) {
        throw new Error("Scorix: Bridge not initialized or implementation not found.");
      }
      return this._bridge[fn](...args);
    },

    invoke(method, params, options) {
      return this._call("invoke", method, params, options);
    },

    emit(topic, data) {
      return this._call("emit", topic, data);
    },

    on(topic, callback) {
      return this._call("on", topic, callback);
    },

    resolve(name, handler) {
      return this._call("resolve", name, handler);
    },
  };

  if (typeof window !== "undefined") {
    window.scorix = orchestrator;
    window.scorix.init().catch(console.error);
  }
})();
