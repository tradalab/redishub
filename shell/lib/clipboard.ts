import scorix from "@/lib/scorix"

export async function writeClipboard(text: string): Promise<void> {
  if (typeof window === "undefined" || window.scorix?.mode !== "web") {
    await scorix.invoke("mod:clipboard:Write", { text })
    return
  }
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text)
    return
  }
  copySelection(text)
}

function copySelection(text: string) {
  const el = document.createElement("textarea")
  el.value = text
  el.setAttribute("readonly", "")
  el.style.position = "fixed"
  el.style.opacity = "0"
  document.body.appendChild(el)
  el.select()
  const copied = document.execCommand("copy")
  el.remove()
  if (!copied) throw new Error("the browser refused to copy")
}
