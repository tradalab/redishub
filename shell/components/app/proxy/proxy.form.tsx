"use client"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"
import { forwardRef, useEffect, useImperativeHandle, useMemo } from "react"
import { toast } from "sonner"

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/trada-ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUpsertProxy, useDeleteProxy, ProxyDO } from "@/hooks/api/proxy.api"

const formSchema = z.object({
  id: z.string().optional(),
  protocol: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  username: z.string().optional(),
  password: z.string().optional(),
})

export type ProxyFormValues = z.infer<typeof formSchema>

export interface PendingState {
  save: boolean
  delete: boolean
}

export interface ProxyFormRef {
  submit: () => Promise<void>
  handleDelete: () => Promise<void>
}

interface ProxyFormProps {
  proxy: Partial<ProxyDO>
  onPendingChange?: (p: PendingState) => void
  onDeleted?: () => void
  onSaved?: () => void
}

export const ProxyForm = forwardRef<ProxyFormRef, ProxyFormProps>(({ proxy, onPendingChange, onDeleted, onSaved }, ref) => {
  const { t } = useTranslation()
  const upsert = useUpsertProxy()
  const remove = useDeleteProxy()

  const defaultValues = useMemo(
    () => ({
      id: proxy?.id,
      protocol: proxy?.protocol ?? "http",
      host: proxy?.host ?? "",
      port: proxy?.port ?? 8080,
      username: proxy?.username ?? "",
      password: proxy?.password ?? "",
    }),
    [proxy]
  )

  const form = useForm<ProxyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
  })

  useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  const pending: PendingState = {
    save: upsert.isPending,
    delete: remove.isPending,
  }

  useEffect(() => {
    onPendingChange?.(pending)
  }, [pending.save, pending.delete, onPendingChange])

  const onSubmit = async (values: ProxyFormValues) => {
    try {
      await upsert.mutateAsync(values)
      toast.success(t("saved"))
      onSaved?.()
    } catch (error: any) {
      toast.error(error?.message ?? t("unknown_error"))
    }
  }

  const handleDelete = async () => {
    if (!proxy?.id) return
    try {
      await remove.mutateAsync(proxy.id)
      toast.success(t("deleted"))
      onDeleted?.()
    } catch (error: any) {
      toast.error(error?.message ?? t("unknown_error"))
    }
  }

  const submit = form.handleSubmit(onSubmit, errors => {
    console.error("[ProxyForm] Validation Errors:", errors)
    const firstError = Object.values(errors)[0]
    if (firstError) {
      toast.error(`${t("validation_error")}: ${firstError.message}`)
    }
  })

  useImperativeHandle(
    ref,
    () => ({
      submit,
      handleDelete,
    }),
    [submit, handleDelete]
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="protocol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("protocol")}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("select_protocol")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="http">HTTP</SelectItem>
                  <SelectItem value="socks5">SOCKS5</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-3">
            <FormField
              control={form.control}
              name="host"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("host")}</FormLabel>
                  <FormControl>
                    <Input placeholder="127.0.0.1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="col-span-1">
            <FormField
              control={form.control}
              name="port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("port")}</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("username")} ({t("optional")})
              </FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("password")} ({t("optional")})
              </FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
})
