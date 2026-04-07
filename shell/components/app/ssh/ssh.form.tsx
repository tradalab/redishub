"use client"

import { useEffect, forwardRef, useImperativeHandle, useMemo } from "react"
import { useForm } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { SshDO } from "@/types/ssh.do"
import { SshKindEnum } from "@/types/ssh-kind.enum"
import { useDeleteSsh, useTestSsh, useUpsertSsh } from "@/hooks/api/ssh.api"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useTranslation } from "react-i18next"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

export interface PendingState {
  save: boolean
  test: boolean
  delete: boolean
}

export interface SshFormRef {
  submit: () => Promise<void>
  testConn: () => Promise<void>
  handleDelete: () => Promise<void>
}

interface Props {
  ssh: Partial<SshDO>
  onPendingChange?: (pending: PendingState) => void
  onSaved?: () => void
  onDeleted?: () => void
}

export const SshForm = forwardRef<SshFormRef, Props>(({ ssh, onPendingChange, onSaved, onDeleted }, ref) => {
  const { t } = useTranslation()

  const defaultValues = useMemo(
    () => ({
      id: ssh.id,
      host: ssh.host ?? "",
      port: ssh.port ?? 22,
      timeout: ssh.timeout ?? 60,
      username: ssh.username ?? "",
      kind: ssh.kind ?? SshKindEnum.PASSWORD,
      password: ssh.password ?? "",
      private_key: ssh.private_key ?? "",
      passphrase: ssh.passphrase ?? "",
    }),
    [ssh]
  )

  const sshSchema = z.object({
    id: z.string().optional(),
    host: z.string().min(1),
    port: z.number(),
    timeout: z.number(),
    username: z.string(),
    kind: z.nativeEnum(SshKindEnum),
    password: z.string().optional(),
    private_key: z.string().optional(),
    passphrase: z.string().optional(),
  })

  type SshFormValues = z.infer<typeof sshSchema>

  const form = useForm<SshFormValues>({
    defaultValues: defaultValues,
    resolver: zodResolver(sshSchema),
  })

  useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  const upsertSsh = useUpsertSsh()
  const deleteSsh = useDeleteSsh()
  const testSsh = useTestSsh()

  const kind = form.watch("kind")

  const pending: PendingState = {
    save: upsertSsh.isPending,
    test: testSsh.isPending,
    delete: deleteSsh.isPending,
  }

  useEffect(() => {
    onPendingChange?.(pending)
  }, [pending.save, pending.test, pending.delete, onPendingChange])

  const submit = form.handleSubmit(
    async values => {
      try {
        await upsertSsh.mutateAsync(values)
        toast.success(t("saved"))
        onSaved?.()
      } catch (e: any) {
        toast.error(e?.message ?? t("unknown_error"))
      }
    },
    errors => {
      const firstError = Object.values(errors)[0]
      if (firstError) {
        toast.error(`${t("validation_error")}: ${firstError.message}`)
      }
    }
  )

  const testConn = form.handleSubmit(async values => {
    try {
      await testSsh.mutateAsync(values)
      toast.success(t("conn_success"))
    } catch (e) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : ""
      toast.error(t("conn_failed"), { description: msg })
    }
  })

  const handleDelete = async () => {
    if (!ssh?.id) return
    try {
      await deleteSsh.mutateAsync(ssh.id)
      toast.success(t("deleted"))
      onDeleted?.()
    } catch (e: any) {
      toast.error(e?.message ?? t("unknown_error"))
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      submit,
      testConn,
      handleDelete,
    }),
    [submit, testConn, handleDelete]
  )

  return (
    <Form {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <FormField
          control={form.control}
          name="host"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Host</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="port"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Port</FormLabel>
              <FormControl>
                <Input type="number" value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="timeout"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timeout (s)</FormLabel>
              <FormControl>
                <Input type="number" value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("username")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth_type")}</FormLabel>
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
          )}
        />

        {kind === SshKindEnum.PASSWORD && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("password")}</FormLabel>
                <FormControl>
                  <Input {...field} type="password" />
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
              name="private_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("private_key")}</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="font-mono text-xs min-h-[120px]" placeholder={t("enter_private_key_pem")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="passphrase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Passphrase</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" />
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
