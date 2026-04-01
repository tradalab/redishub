"use client"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"
import { forwardRef, useEffect, useImperativeHandle } from "react"

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
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
}

export const ProxyForm = forwardRef<ProxyFormRef, ProxyFormProps>(({ proxy, onPendingChange, onDeleted }, ref) => {
  const { t } = useTranslation()
  const upsert = useUpsertProxy()
  const remove = useDeleteProxy()

  const form = useForm<ProxyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: proxy?.id,
      protocol: proxy?.protocol ?? "http",
      host: proxy?.host ?? "",
      port: proxy?.port ?? 8080,
      username: proxy?.username ?? "",
      password: proxy?.password ?? "",
    },
  })

  useEffect(() => {
    form.reset({
      id: proxy?.id,
      protocol: proxy?.protocol ?? "http",
      host: proxy?.host ?? "",
      port: proxy?.port ?? 8080,
      username: proxy?.username ?? "",
      password: proxy?.password ?? "",
    })
  }, [proxy, form])

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
    } catch (error) {
      console.error(error)
    }
  }

  const handleDelete = async () => {
    if (!proxy?.id) return
    try {
      await remove.mutateAsync(proxy.id)
      onDeleted?.()
    } catch (error) {
      console.error(error)
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      submit: () => form.handleSubmit(onSubmit)(),
      handleDelete,
    }),
    [form, onSubmit, handleDelete]
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
