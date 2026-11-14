import { describe, expect, it } from "vitest"
import { hostKeyAsk } from "./host-key"

function scorixError(code: string, details?: unknown) {
  return Object.assign(new Error("netx: host key"), { name: "ScorixError", code, details })
}

const key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl"

describe("hostKeyAsk", () => {
  it("reads the key and fingerprint of an untrusted host", () => {
    expect(hostKeyAsk(scorixError("ssh_host_key_unknown", { key, fingerprint: "SHA256:abc" }))).toEqual({ key, fingerprint: "SHA256:abc", changed: false })
  })

  it("marks a changed key so the prompt can warn", () => {
    expect(hostKeyAsk(scorixError("ssh_host_key_changed", { key, fingerprint: "SHA256:abc" }))?.changed).toBe(true)
  })

  it("asks nothing for other failures or a fault without the key", () => {
    expect(hostKeyAsk(scorixError("unavailable", { key }))).toBeNull()
    expect(hostKeyAsk(scorixError("ssh_host_key_unknown", {}))).toBeNull()
    expect(hostKeyAsk(new Error("ssh connect failed"))).toBeNull()
    expect(hostKeyAsk("plain string")).toBeNull()
  })
})
