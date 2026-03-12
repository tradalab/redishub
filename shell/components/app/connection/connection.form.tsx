"use client"

import { useEffect, forwardRef, useImperativeHandle } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Form } from "@/components/ui/form"
import { useTranslation } from "react-i18next"

import { Panel } from "@/components/ui/trada-ui/panel"
import { ConnectionGeneralForm } from "@/components/app/connection/connection-general.form"
import { ConnectionSshTunnelForm } from "@/components/app/connection/connection-ssh-tunnel.form"

import { ConnectionDO } from "@/types/connection.do"

import { useTestConnection, useUpsertConnection } from "@/hooks/api/connection.api"

export interface PendingState {
  save: boolean
  test: boolean
}

export interface ConnectionFormRef {
  submit: () => Promise<boolean>
  testConn: () => Promise<void>
}

interface Props {
  connection?: Partial<ConnectionDO>
  onPendingChange?: (p: PendingState) => void
}

export const ConnectionForm = forwardRef<ConnectionFormRef, Props>(({ connection, onPendingChange }, ref) => {
  const { t } = useTranslation()

  const form = useForm<Partial<ConnectionDO>>({
    defaultValues: connection,
  })

  const upsertConnection = useUpsertConnection()
  const testConnection = useTestConnection()

  useEffect(() => {
    form.reset(connection)
  }, [connection, form])

  const pending: PendingState = {
    save: upsertConnection.isPending,
    test: testConnection.isPending,
  }

  useEffect(() => {
    onPendingChange?.(pending)
  }, [pending.save, pending.test])

  const submit = () =>
    new Promise<boolean>(resolve => {
      form.handleSubmit(
        async values => {
          try {
            await upsertConnection.mutateAsync(values)
            toast.success(t("saved"))
            resolve(true)
          } catch (e: any) {
            toast.error(e?.message ?? t("unknown_error"))
            resolve(false)
          }
        },
        () => resolve(false)
      )()
    })

  const testConn = form.handleSubmit(async values => {
    try {
      await testConnection.mutateAsync(values)
      toast.success(t("conn_success"))
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : ""
      toast.error(t("conn_failed"), { description: msg })
    }
  })

  useImperativeHandle(
    ref,
    () => ({
      submit,
      testConn,
    }),
    [submit, testConn]
  )

  return (
    <Form {...form}>
      <form onSubmit={submit} className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-hidden px-0 py-0 min-h-0">
          <Panel
            items={[
              {
                key: "conn-general-form",
                label: t("general"),
                content: <ConnectionGeneralForm form={form} />,
              },
              {
                key: "conn-ssh-tunnel-form",
                label: t("ssh_tunnel"),
                content: <ConnectionSshTunnelForm form={form} />,
              },
            ]}
          />
        </div>
      </form>
    </Form>
  )
})
