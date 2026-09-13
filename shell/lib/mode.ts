"use client"

// Web mode ships as a container image, so the binary is replaced by pulling a
// new image. The updater module answers either way, so anything that would
// rewrite the binary has to ask first.
export function isWebMode(): boolean {
  return typeof window !== "undefined" && window.scorix?.mode === "web"
}
