"use client"

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Plus, Trash } from "lucide-react"
import { useRef, useState } from "react"
import { SshDO } from "@/types/ssh.do"
import { useSshList } from "@/hooks/api/ssh.api"
import { SshForm, SshFormRef } from "./ssh.form"
import { SshKindEnum } from "@/types/ssh-kind.enum"
import { useTranslation } from "react-i18next"
import { v7 as uuidv7 } from "uuid"

export type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function SshDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const { data: sshList = [], isLoading } = useSshList()
  const [selected, setSelected] = useState<Partial<SshDO> | null>(null)
  const formRef = useRef<SshFormRef>(null)

  const handleAdd = () => {
    setSelected({
      id: uuidv7(),
      host: "127.0.0.1",
      port: 22,
      username: "",
      kind: SshKindEnum.PASSWORD,
      password: "",
      private_key_file: "",
      passphrase: "",
    })
  }

  const handleClear = () => {
    setSelected(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[700px] p-0 flex flex-col h-[85vh]"
        onInteractOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{t("ssh_configurations")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-[260px] border-r flex flex-col">
            <div className="flex items-center gap-1 p-2 border-b">
              <Button size="icon" variant="ghost" onClick={handleAdd}>
                <Plus className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={handleClear} disabled={!selected}>
                <Trash className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoading && (
                <div className="p-4 flex justify-center">
                  <Spinner />
                </div>
              )}
              {sshList?.map(ssh => {
                const active = selected?.id === ssh.id
                return (
                  <div
                    key={ssh.id}
                    onClick={() => setSelected(ssh)}
                    className={`px-3 py-2 text-sm cursor-pointer border-l-2 ${active ? "bg-muted border-primary" : "border-transparent hover:bg-muted"}`}
                  >
                    {ssh.username}@{ssh.host}:{ssh.port}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex-1 p-4 overflow-auto">{selected && <SshForm ref={formRef} ssh={selected} />}</div>
        </div>
        {selected && (
          <DialogFooter className="px-6 py-4 border-t flex gap-2">
            <Button size="sm" variant="outline" disabled={formRef.current?.isPending?.test} onClick={() => formRef.current?.testConn()}>
              {t("test_conn")}
            </Button>
            <Button size="sm" variant="outline" disabled={formRef.current?.isPending?.save} onClick={() => formRef.current?.submit()}>
              {t("save")}
            </Button>
            <Button size="sm" variant="default" disabled={formRef.current?.isPending?.delete} onClick={() => formRef.current?.handleDelete()}>
              {t("delete")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
