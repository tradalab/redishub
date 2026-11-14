import { afterEach, describe, expect, it, vi } from "vitest"
import { writeClipboard } from "@/api/modules"

function fakeDocument(copied: boolean) {
  const el = { value: "", style: {} as Record<string, string>, setAttribute: vi.fn(), select: vi.fn(), remove: vi.fn() }
  return {
    el,
    doc: { createElement: vi.fn(() => el), body: { appendChild: vi.fn() }, execCommand: vi.fn(() => copied) },
  }
}

describe("writeClipboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("goes through the clipboard module in the native app", async () => {
    const invoke = vi.fn().mockResolvedValue("ok")
    vi.stubGlobal("window", { scorix: { mode: "app", invoke } })
    vi.stubGlobal("navigator", {})
    await writeClipboard("user:1")
    expect(invoke).toHaveBeenCalledWith("mod:clipboard:Write", { text: "user:1" }, undefined)
  })

  it("uses the browser clipboard in web mode", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal("window", { scorix: { mode: "web" } })
    vi.stubGlobal("navigator", { clipboard: { writeText } })
    await writeClipboard("user:1")
    expect(writeText).toHaveBeenCalledWith("user:1")
  })

  it("copies a selection in web mode served off localhost", async () => {
    const { el, doc } = fakeDocument(true)
    vi.stubGlobal("window", { scorix: { mode: "web" } })
    vi.stubGlobal("navigator", {})
    vi.stubGlobal("document", doc)
    await writeClipboard("user:1")
    expect(el.value).toBe("user:1")
    expect(doc.execCommand).toHaveBeenCalledWith("copy")
    expect(el.remove).toHaveBeenCalled()
  })

  it("falls back to a selection copy when the browser clipboard refuses", async () => {
    const { el, doc } = fakeDocument(true)
    const writeText = vi.fn().mockRejectedValue(new DOMException("no user activation", "NotAllowedError"))
    vi.stubGlobal("window", { scorix: { mode: "web" } })
    vi.stubGlobal("navigator", { clipboard: { writeText } })
    vi.stubGlobal("document", doc)
    await writeClipboard("user:1")
    expect(writeText).toHaveBeenCalled()
    expect(el.value).toBe("user:1")
    expect(doc.execCommand).toHaveBeenCalledWith("copy")
  })

  it("fails loudly when the selection copy is refused", async () => {
    const { el, doc } = fakeDocument(false)
    vi.stubGlobal("window", { scorix: { mode: "web" } })
    vi.stubGlobal("navigator", {})
    vi.stubGlobal("document", doc)
    await expect(writeClipboard("user:1")).rejects.toThrow()
    expect(el.remove).toHaveBeenCalled()
  })

  it("waits for a late bridge before deciding where to copy", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const win: { scorix?: { mode: string } } = {}
    vi.stubGlobal("window", win)
    vi.stubGlobal("navigator", { clipboard: { writeText } })
    setTimeout(() => (win.scorix = { mode: "web" }), 60)
    await writeClipboard("user:1")
    expect(writeText).toHaveBeenCalledWith("user:1")
  })
})
