import { webcrypto } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useCommandStore } from "./command.store"
import { useTabStore } from "./tab.store"

describe("stores outside a secure context", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("opens a tab", () => {
    useTabStore.getState().addTab({ type: "general", title: "t", connectionId: "c1", databaseIdx: 0 })
    const { tabs, activeTabId } = useTabStore.getState()
    expect(tabs).toHaveLength(1)
    expect(activeTabId).toBe(tabs[0].id)
  })

  it("records a console command", () => {
    useCommandStore.getState().addHistory({ command: "PING", connectionId: "c1", databaseIdx: 0 })
    expect(useCommandStore.getState().history[0]?.id).toBeTruthy()
  })
})
