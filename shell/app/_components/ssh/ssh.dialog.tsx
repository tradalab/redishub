"use client"

import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { v7 as uuidv7 } from "uuid"
import { ConfigListDialog, sshDefaults } from "@tradalab/lyra/blocks"
import { useSshList } from "@/hooks/api/ssh.api"
import { useConfigLabels } from "@/hooks/use-config-labels"
import { SshReq as SshDO } from "@/types"
import { SshForm, SshFormRef } from "./ssh.form"

export type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function SshDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const labels = useConfigLabels()
  const { data: sshList = [], isLoading } = useSshList()
  const [selected, setSelected] = useState<Partial<SshDO> | null>(null)
  const formRef = useRef<SshFormRef>(null)

  return (
    <ConfigListDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("ssh_configurations")}
      items={sshList}
      loading={isLoading}
      getId={ssh => ssh.id}
      renderItem={ssh => `${ssh.username}@${ssh.host}:${ssh.port}`}
      selectedId={selected?.id}
      onSelect={setSelected}
      onAdd={() => setSelected({ ...sshDefaults({ host: "127.0.0.1" }), id: uuidv7() })}
      onDelete={() => formRef.current?.handleDelete()}
      onTest={() => formRef.current?.testConn()}
      onSave={() => formRef.current?.submit()}
      labels={labels.dialog}
    >
      {selected && <SshForm ref={formRef} ssh={selected} saved={sshList.some(s => s.id === selected.id)} onDeleted={() => setSelected(null)} />}
    </ConfigListDialog>
  )
}
