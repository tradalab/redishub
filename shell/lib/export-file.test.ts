import { describe, expect, it } from "vitest"
import { fromBase64, toBase64, toCsv } from "./export-file"

describe("toCsv", () => {
  it("quotes cells with commas, quotes and newlines", () => {
    const csv = toCsv(
      ["key", "bytes"],
      [
        ['a,"b"', 1],
        ["line\nbreak", 2],
        ["plain", 3],
      ]
    )
    expect(csv).toBe('﻿key,bytes\r\n"a,""b""",1\r\n"line\nbreak",2\r\nplain,3\r\n')
  })
})

describe("base64", () => {
  it("round-trips every byte value", () => {
    const bytes = new Uint8Array(70000).map((_, i) => i % 256)
    expect(fromBase64(toBase64(bytes))).toEqual(bytes)
  })
})
