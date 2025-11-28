"use client"

import { ReactNode, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTheme } from "next-themes"
import { version } from "../../package.json"
import { Button } from "@/components/ui/button"
import { useUpdater } from "@/hooks/use-updater"
import { Spinner } from "@/components/ui/spinner"
import scorix from "@/lib/scorix"

export function SettingDialog({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme()
  const { checkUpdate, newVersion, loading } = useUpdater(false)
  const [checked, setChecked] = useState(false)

  const handleCheck = async () => {
    setChecked(false)
    await checkUpdate()
    setChecked(true)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] space-y-4">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="theme-select">Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger id="theme-select" className="w-full">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Check Update</Label>
            <div className="flex items-center gap-2">
              <Button className="w-full" size="sm" variant="outline" onClick={handleCheck}>
                {loading ? (
                  <>
                    <Spinner /> Checking...
                  </>
                ) : checked ? (
                  newVersion ? (
                    `⬆️ Update available: v${newVersion}`
                  ) : (
                    "✅ Up to date"
                  )
                ) : (
                  "Check Update"
                )}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <div className="flex items-center justify-between w-full text-sm">
            <div className="flex gap-4">
              <a
                href="#"
                onClick={e => {
                  e.preventDefault()
                  scorix.invoke("ext:browser:OpenUrl", "https://github.com/tradalab/redishub")
                }}
                className="text-blue-500 underline"
              >
                GitHub
              </a>
              <a
                href="#"
                onClick={e => {
                  e.preventDefault()
                  scorix.invoke("ext:browser:OpenUrl", "https://github.com/tradalab/redishub/issues")
                }}
                className="text-blue-500 underline"
              >
                Report Issues
              </a>
            </div>
            <span className="font-bold">v{version}</span>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
