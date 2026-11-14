"use client"

import { forwardRef, useEffect, useImperativeHandle } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Form, TlsFields, tlsDefaults, type TlsValues } from "@tradalab/lyra/blocks"
import { toast } from "@tradalab/lyra/ui"
import { useDeleteTls, useUpsertTls } from "@/hooks/api/tls.api"
import { useConfigLabels } from "@/hooks/use-config-labels"
import { TlsReq as TlsDO } from "@/types"

export interface TlsFormRef {
  submit: () => Promise<void>
  handleDelete: () => Promise<void>
}

interface Props {
  tls: Partial<TlsDO>
  saved: boolean
  onSaved?: () => void
  onDeleted?: () => void
}

export const TlsForm = forwardRef<TlsFormRef, Props>(({ tls, saved, onSaved, onDeleted }, ref) => {
  const { t } = useTranslation()
  const labels = useConfigLabels()
  const upsertTls = useUpsertTls()
  const deleteTls = useDeleteTls()
  const form = useForm<TlsValues>({ defaultValues: tlsDefaults(tls) })

  useEffect(() => {
    form.reset(tlsDefaults(tls))
  }, [tls, form])

  const submit = form.handleSubmit(async values => {
    try {
      await upsertTls.mutateAsync(values as Partial<TlsDO>)
      toast.add({ title: t("saved"), type: "success" })
      onSaved?.()
    } catch (e) {
      toast.add({ title: e instanceof Error ? e.message : t("unknown_error"), type: "error" })
    }
  })

  const handleDelete = async () => {
    if (!tls?.id) return
    try {
      await deleteTls.mutateAsync(tls.id)
      toast.add({ title: t("deleted"), type: "success" })
      onDeleted?.()
    } catch (e) {
      toast.add({ title: e instanceof Error ? e.message : t("unknown_error"), type: "error" })
    }
  }

  useImperativeHandle(ref, () => ({ submit: () => submit(), handleDelete }))

  return (
    <Form {...form}>
      <form onSubmit={submit}>
        <TlsFields form={form} labels={labels.tls} serverNamePlaceholder="redis.example.com" secretPlaceholder={saved ? t("secret_keep_hint") : undefined} />
      </form>
    </Form>
  )
})
