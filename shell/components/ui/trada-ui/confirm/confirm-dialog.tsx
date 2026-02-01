"use client"

import { Dialog, DialogContent, DialogDescription, DialogOverlay, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ConfirmOptions } from "./types"
import { cn } from "@/lib/utils"

type Props = {
  options: ConfirmOptions
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ options, onConfirm, onCancel }: Props) {
  return (
    <Dialog open onOpenChange={val => !val && onCancel()}>
      <DialogOverlay className="fixed inset-0 bg-white/10" />
      <DialogContent className={cn("fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2", "p-6 w-[400px]", "focus:outline-none")}>
        <DialogTitle className="text-lg font-medium">{options.title}</DialogTitle>
        {options.description && <DialogDescription className="mt-2 text-sm text-muted-foreground">{options.description}</DialogDescription>}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {options.cancelText ?? "Cancel"}
          </Button>
          <Button size="sm" onClick={onConfirm} className={cn(options.danger && "bg-red-600 hover:bg-red-700 text-white")}>
            {options.confirmText ?? "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
