import scorix from "@/lib/scorix"

export function openExternal(url: string) {
  if (typeof window !== "undefined" && window.scorix?.mode === "web") {
    window.open(url, "_blank", "noopener,noreferrer")
    return
  }
  void scorix.invoke("mod:browser:OpenUrl", { url }).catch(() => {})
}
