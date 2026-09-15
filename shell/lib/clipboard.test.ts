import { afterEach, describe, expect, it, vi } from "vitest"
import { writeClipboard } from "./clipboard"

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

  it("fails loudly when the selection copy is refused", async () => {
    const { el, doc } = fakeDocument(false)
    vi.stubGlobal("window", { scorix: { mode: "web" } })
    vi.stubGlobal("navigator", {})
    vi.stubGlobal("document", doc)
    await expect(writeClipboard("user:1")).rejects.toThrow()
    expect(el.remove).toHaveBeenCalled()
  })
})
