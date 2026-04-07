"use client"

import { useEffect, forwardRef, useImperativeHandle, useCallback } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useTranslation } from "react-i18next"
import { GroupDO } from "@/types/group.do"
import { useUpsertGroup } from "@/hooks/api/group.api"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Input } from "@/components/ui/input"

export interface PendingState {
  save: boolean
}

export interface GroupFormRef {
  submit: () => Promise<boolean>
}

interface Props {
  group?: Partial<GroupDO>
  onPendingChange?: (p: PendingState) => void
}

export const GroupForm = forwardRef<GroupFormRef, Props>(({ group, onPendingChange }, ref) => {
  const { t } = useTranslation()

  const groupSchema = z.object({
    name: z.string().min(1, { message: "Name must contain at least 1 character(s)" }).max(255, { message: "Name must contain at most 255 character(s)" }),
  })

  type GroupFormValues = z.infer<typeof groupSchema>

  const form = useForm<GroupFormValues>({
    defaultValues: group,
    resolver: zodResolver(groupSchema),
  })

  const upsertGroup = useUpsertGroup()

  useEffect(() => {
    form.reset(group)
  }, [group, form])

  const pending: PendingState = {
    save: upsertGroup.isPending,
  }

  const submit = useCallback(
    () =>
      new Promise<boolean>(resolve => {
        form.handleSubmit(
          async values => {
            try {
              await upsertGroup.mutateAsync({ ...values, id: group?.id })
              toast.success(t("saved"))
              resolve(true)
            } catch (e: any) {
              toast.error(e?.message ?? t("unknown_error"))
              resolve(false)
            }
          },
          () => resolve(false)
        )()
      }),
    [form, upsertGroup, group?.id, t]
  )

  useEffect(() => {
    onPendingChange?.(pending)
  }, [pending.save, onPendingChange])

  useImperativeHandle(ref, () => ({ submit }), [submit])

  return (
    <Form {...form}>
      <form onSubmit={submit} className="flex flex-col flex-1 min-h-0 p-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel className="flex items-center justify-between">{t("name")}*</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />
      </form>
    </Form>
  )
})
