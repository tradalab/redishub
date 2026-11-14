"use client"

import { forwardRef, useEffect, useImperativeHandle } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Form, ProxyFields, proxyDefaults, type ProxyValues } from "@tradalab/lyra/blocks"
import { toast } from "@tradalab/lyra/ui"
import { useDeleteProxy, useUpsertProxy } from "@/hooks/api/proxy.api"
import { useConfigLabels } from "@/hooks/use-config-labels"
import { ProxyReq as ProxyDO } from "@/types"

export interface ProxyFormRef {
  submit: () => Promise<void>
  handleDelete: () => Promise<void>
}

interface ProxyFormProps {
  proxy: Partial<ProxyDO>
  saved: boolean
  onDeleted?: () => void
  onSaved?: () => void
}

export const ProxyForm = forwardRef<ProxyFormRef, ProxyFormProps>(({ proxy, saved, onDeleted, onSaved }, ref) => {
  const { t } = useTranslation()
  const labels = useConfigLabels()
  const upsert = useUpsertProxy()
  const remove = useDeleteProxy()
  const form = useForm<ProxyValues>({ defaultValues: proxyDefaults(proxy) })

  useEffect(() => {
    form.reset(proxyDefaults(proxy))
  }, [proxy, form])

  const submit = form.handleSubmit(
    async values => {
      try {
        await upsert.mutateAsync(values)
        toast.add({ title: t("saved"), type: "success" })
        onSaved?.()
      } catch (error) {
        toast.add({ title: error instanceof Error ? error.message : t("unknown_error"), type: "error" })
      }
    },
    errors => {
      const first = Object.values(errors)[0]
      if (first) toast.add({ title: `${t("validation_error")}: ${first.message}`, type: "error" })
    }
  )

  const handleDelete = async () => {
    if (!proxy?.id) return
    try {
      await remove.mutateAsync(proxy.id)
      toast.add({ title: t("deleted"), type: "success" })
      onDeleted?.()
    } catch (error) {
      toast.add({ title: error instanceof Error ? error.message : t("unknown_error"), type: "error" })
    }
  }

  useImperativeHandle(ref, () => ({ submit: () => submit(), handleDelete }))

  return (
    <Form {...form}>
      <form onSubmit={submit}>
        <ProxyFields form={form} labels={labels.proxy} secretPlaceholder={saved ? t("secret_keep_hint") : undefined} />
      </form>
    </Form>
  )
})
