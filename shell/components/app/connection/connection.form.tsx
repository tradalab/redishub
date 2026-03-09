"use client"

import { useEffect, forwardRef, useImperativeHandle, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { SshDO } from "@/types/ssh.do"
import { Form } from "@/components/ui/form"
import { useTranslation } from "react-i18next"
import { ConnectionDo } from "@/types/connection.do"
import { Panel } from "@/components/ui/trada-ui/panel"
import { ConnectionGeneralForm } from "@/components/app/connection/connection-general.form"
import { ConnectionSshTunnelForm } from "@/components/app/connection/connection-ssh-tunnel.form"
import { useTestConnection, useUpsertConnection } from "@/hooks/api/connection.api"

export interface ConnectionFormRef {
  submit: () => Promise<boolean>
  testConn: () => void
  isPending: any
}

interface Props {
  connection?: Partial<ConnectionDo>
}

export const ConnectionForm = forwardRef<ConnectionFormRef, Props>(({ connection }, ref) => {
  const { t } = useTranslation()
  const form = useForm<Partial<SshDO>>({ defaultValues: connection })
  const [isPending, setIsPending] = useState({ save: false, test: false })
  const upsertConnection = useUpsertConnection()
  const testConnection = useTestConnection()

  useEffect(() => form.reset(connection), [connection])

  const submit = () =>
    new Promise<boolean>(resolve => {
      form.handleSubmit(
        async values => {
          try {
            setIsPending(p => ({ ...p, save: true }))
            await upsertConnection.mutateAsync(values)
            toast.success(t("saved"))
            resolve(true)
          } catch (e: any) {
            toast.error(e?.message ?? t("unknown_error"))
            resolve(false)
          } finally {
            setIsPending(p => ({ ...p, save: false }))
          }
        },
        () => {
          resolve(false)
        }
      )()
    })

  const testConn = form.handleSubmit(async values => {
    try {
      setIsPending(p => ({ ...p, test: true }))
      await testConnection.mutateAsync(values)
      toast.success(t("conn_success"))
    } catch {
      toast.error(t("conn_failed"))
    } finally {
      setIsPending(p => ({ ...p, test: false }))
    }
  })

  useImperativeHandle(ref, () => ({ submit, testConn, isPending }))

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
