"use client"

import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { v7 as uuidv7 } from "uuid"
import { ConfigListDialog, tlsDefaults } from "@tradalab/lyra/blocks"
import { useTlsList } from "@/hooks/api/tls.api"
import { useConfigLabels } from "@/hooks/use-config-labels"
import { TlsReq as TlsDO } from "@/types"
import { TlsForm, TlsFormRef } from "./tls.form"

export type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function TlsDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const labels = useConfigLabels()
  const { data: tlsList = [], isLoading } = useTlsList()
  const [selected, setSelected] = useState<Partial<TlsDO> | null>(null)
  const formRef = useRef<TlsFormRef>(null)

  return (
    <ConfigListDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("tls_configurations")}
      items={tlsList}
      loading={isLoading}
      getId={tls => tls.id}
      renderItem={tls => tls.name || tls.server_name || "TLS"}
      selectedId={selected?.id}
      onSelect={setSelected}
      onAdd={() => setSelected({ ...tlsDefaults(), id: uuidv7() })}
      onDelete={() => formRef.current?.handleDelete()}
      onSave={() => formRef.current?.submit()}
      labels={labels.dialog}
    >
      {selected && <TlsForm ref={formRef} tls={selected} saved={tlsList.some(s => s.id === selected.id)} onDeleted={() => setSelected(null)} />}
    </ConfigListDialog>
  )
}
