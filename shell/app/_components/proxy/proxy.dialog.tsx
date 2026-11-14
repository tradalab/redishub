"use client"

import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { v7 as uuidv7 } from "uuid"
import { ConfigListDialog, proxyDefaults } from "@tradalab/lyra/blocks"
import { useProxyList } from "@/hooks/api/proxy.api"
import { useConfigLabels } from "@/hooks/use-config-labels"
import { ProxyReq as ProxyDO } from "@/types"
import { ProxyForm, ProxyFormRef } from "./proxy.form"

interface ProxyDialogProps {
  open: boolean
  onClose: () => void
}

export function ProxyDialog({ open, onClose }: ProxyDialogProps) {
  const { t } = useTranslation()
  const labels = useConfigLabels()
  const { data: proxyList = [], isLoading } = useProxyList()
  const [selected, setSelected] = useState<Partial<ProxyDO> | null>(null)
  const formRef = useRef<ProxyFormRef>(null)

  return (
    <ConfigListDialog
      open={open}
      onOpenChange={onClose}
      title={t("proxy_configurations")}
      className="h-[80vh]"
      items={proxyList}
      loading={isLoading}
      getId={p => p.id}
      renderItem={p => `[${p.protocol.toUpperCase()}] ${p.host}:${p.port}`}
      selectedId={selected?.id}
      onSelect={setSelected}
      onAdd={() => setSelected({ ...proxyDefaults({ host: "127.0.0.1" }), id: uuidv7() })}
      onDelete={() => formRef.current?.handleDelete()}
      onSave={() => formRef.current?.submit()}
      labels={labels.dialog}
    >
      {selected && <ProxyForm ref={formRef} proxy={selected} saved={proxyList.some(p => p.id === selected.id)} onDeleted={() => setSelected(null)} />}
    </ConfigListDialog>
  )
}
