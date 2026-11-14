"use client"

import { forwardRef, useEffect, useImperativeHandle } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Form, SshFields, sshDefaults, type SshValues } from "@tradalab/lyra/blocks"
import { toast } from "@tradalab/lyra/ui"
import { useDeleteSsh, useTestSsh, useUpsertSsh } from "@/hooks/api/ssh.api"
import { useConfigLabels } from "@/hooks/use-config-labels"
import { useConfirmHostKey } from "@/hooks/use-host-key"
import { hostKeyAsk } from "@/lib/host-key"
import { SshReq as SshDO } from "@/types"

export interface SshFormRef {
  submit: () => Promise<void>
  testConn: () => Promise<void>
  handleDelete: () => Promise<void>
}

interface Props {
  ssh: Partial<SshDO>
  saved: boolean
  onSaved?: () => void
  onDeleted?: () => void
}

function toValues(ssh: Partial<SshDO>): SshValues {
  return sshDefaults({ ...ssh, kind: ssh.kind as SshValues["kind"] })
}

export const SshForm = forwardRef<SshFormRef, Props>(({ ssh, saved, onSaved, onDeleted }, ref) => {
  const { t } = useTranslation()
  const labels = useConfigLabels()
  const secretPlaceholder = saved ? t("secret_keep_hint") : undefined
  const form = useForm<SshValues>({ defaultValues: toValues(ssh) })
  const upsertSsh = useUpsertSsh()
  const deleteSsh = useDeleteSsh()
  const testSsh = useTestSsh()
  const confirmHostKey = useConfirmHostKey()

  useEffect(() => {
    form.reset(toValues(ssh))
  }, [ssh, form])

  const invalid = (errors: object) => {
    const first = Object.values(errors)[0] as { message?: string } | undefined
    if (first) toast.add({ title: `${t("validation_error")}: ${first.message}`, type: "error" })
  }

  const submit = form.handleSubmit(async values => {
    try {
      await upsertSsh.mutateAsync(values)
      toast.add({ title: t("saved"), type: "success" })
      onSaved?.()
    } catch (e) {
      toast.add({ title: e instanceof Error ? e.message : t("unknown_error"), type: "error" })
    }
  }, invalid)

  const testConn = form.handleSubmit(async values => {
    try {
      await testSsh.mutateAsync(values)
      toast.add({ title: t("conn_success"), type: "success" })
    } catch (e) {
      const ask = hostKeyAsk(e)
      if (ask) {
        if (!(await confirmHostKey(ask))) return
        form.setValue("host_key", ask.key, { shouldDirty: true })
        toast.add({ title: t("host_key_trusted"), type: "info" })
        return
      }
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : ""
      toast.add({ title: t("conn_failed"), description: msg, type: "error" })
    }
  }, invalid)

  const handleDelete = async () => {
    if (!ssh?.id) return
    try {
      await deleteSsh.mutateAsync(ssh.id)
      toast.add({ title: t("deleted"), type: "success" })
      onDeleted?.()
    } catch (e) {
      toast.add({ title: e instanceof Error ? e.message : t("unknown_error"), type: "error" })
    }
  }

  useImperativeHandle(ref, () => ({ submit: () => submit(), testConn: () => testConn(), handleDelete }))

  return (
    <Form {...form}>
      <form onSubmit={submit}>
        <SshFields form={form} labels={labels.ssh} secretPlaceholder={secretPlaceholder} pinHostKey />
      </form>
    </Form>
  )
})
