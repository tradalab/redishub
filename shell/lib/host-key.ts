import { isScorixError } from "@/lib/scorix"

export type HostKeyAsk = { key: string; fingerprint: string; changed: boolean }

export function hostKeyAsk(e: unknown): HostKeyAsk | null {
  if (!isScorixError(e) || (e.code !== "ssh_host_key_unknown" && e.code !== "ssh_host_key_changed")) return null
  const details = (e.details ?? {}) as { key?: unknown; fingerprint?: unknown }
  if (typeof details.key !== "string" || !details.key) return null
  return { key: details.key, fingerprint: String(details.fingerprint ?? ""), changed: e.code === "ssh_host_key_changed" }
}
