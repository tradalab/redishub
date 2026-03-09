"use client"

import { useEffect, forwardRef, useImperativeHandle, useState } from "react"
import { useForm } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { SshDO } from "@/types/ssh.do"
import { SshKindEnum } from "@/types/ssh-kind.enum"
import { useDeleteSsh, useTestSsh, useUpsertSsh } from "@/hooks/api/ssh.api"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useTranslation } from "react-i18next"

export interface SshFormRef {
  submit: () => void
  testConn: () => void
  handleDelete: () => void
  isPending: any
}

interface Props {
  ssh: Partial<SshDO>
}

export const SshForm = forwardRef<SshFormRef, Props>(({ ssh }, ref) => {
  const { t } = useTranslation()
  const form = useForm<Partial<SshDO>>({ defaultValues: ssh })
  const [isPending, setIsPending] = useState({ save: false, test: false, delete: false })
  const upsertSsh = useUpsertSsh()
  const deleteSsh = useDeleteSsh()
  const testSsh = useTestSsh()

  useEffect(() => form.reset(ssh), [ssh])

  const kind = form.watch("kind")

  const submit = form.handleSubmit(async values => {
    try {
      setIsPending(p => ({ ...p, save: true }))
      await upsertSsh.mutateAsync(values)
      toast.success(t("saved"))
    } catch (e: any) {
      toast.error(e?.message ?? t("unknown_error"))
    } finally {
      setIsPending(p => ({ ...p, save: false }))
    }
  })

  const testConn = form.handleSubmit(async values => {
    try {
      setIsPending(p => ({ ...p, test: true }))
      await testSsh.mutateAsync(values)
      toast.success(t("conn_success"))
    } catch {
      toast.error(t("conn_failed"))
    } finally {
      setIsPending(p => ({ ...p, test: false }))
    }
  })

  const handleDelete = async () => {
    try {
      setIsPending(p => ({ ...p, delete: true }))
      await deleteSsh.mutateAsync(ssh?.id || "")
      toast.success(t("deleted"))
    } catch (e: any) {
      toast.error(e?.message ?? t("unknown_error"))
    } finally {
      setIsPending(p => ({ ...p, delete: false }))
    }
  }

  useImperativeHandle(ref, () => ({ submit, testConn, handleDelete, isPending }))

  return (
    <Form {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <FormField
          control={form.control}
          name="host"
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel className="flex items-center justify-between">Host</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />
        <FormField
          control={form.control}
          name="port"
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel className="flex items-center justify-between">Port</FormLabel>
                <FormControl>
                  <Input {...field} type="number" onChange={e => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel className="flex items-center justify-between">{t("username")}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />
        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel className="flex items-center justify-between">{t("auth_type")}</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SshKindEnum.PASSWORD}>{t("password")}</SelectItem>
                      <SelectItem value={SshKindEnum.KEYPAIR}>Keypair</SelectItem>
                      <SelectItem value={SshKindEnum.AGENT}>SSH Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />

        {kind === SshKindEnum.PASSWORD && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("password")}</FormLabel>
                <FormControl>
                  <Input {...field} type="password" placeholder="" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {kind === SshKindEnum.KEYPAIR && (
          <>
            <FormField
              control={form.control}
              name="private_key_file"
              render={({ field }) => {
                return (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">{t("private_key_file")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
            <FormField
              control={form.control}
              name="passphrase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Passphrase</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </form>
    </Form>
  )
})
