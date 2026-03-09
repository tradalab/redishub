"use client"

import { useRef } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { ConnectionDo } from "@/types/connection.do"
import { ConnectionForm, ConnectionFormRef } from "./connection.form"

export type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  connection: Partial<ConnectionDo> | null
}

export function ConnectionDialog({ open, onOpenChange, connection }: Props) {
  const { t } = useTranslation()

  const formRef = useRef<ConnectionFormRef>(null)

  if (!connection) return null

  const isEdit = Boolean(connection.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[700px] p-0 flex flex-col h-[85vh]"
        onInteractOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="text-sm">{isEdit ? t("update_connection") : t("new_connection")}</DialogTitle>
        </DialogHeader>

        <ConnectionForm ref={formRef} connection={connection} />

        <DialogFooter className="p-2 border-t flex gap-2">
          <Button size="sm" variant="outline" disabled={formRef.current?.isPending?.test} onClick={() => formRef.current?.testConn()}>
            {t("test_conn")}
          </Button>
          <DialogClose asChild>
            <Button size="sm" variant="outline" disabled={formRef.current?.isPending?.save || formRef.current?.isPending?.test}>
              {t("cancel")}
            </Button>
          </DialogClose>
          <Button
            size="sm"
            variant="outline"
            disabled={formRef.current?.isPending?.save}
            onClick={async () => {
              const ok = await formRef.current?.submit()
              if (ok) {
                onOpenChange(false)
              }
            }}
          >
            {isEdit ? t("update") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
