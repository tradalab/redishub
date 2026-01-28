"use client"

import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useForm } from "react-hook-form"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { GroupDO } from "@/types/group.do"
import scorix from "@/lib/scorix"
import { useTranslation } from "react-i18next"

type GroupUpdateDialogProps = {
  group: GroupDO
  reload: () => void
  open: boolean
  setOpen: (open: boolean) => void
}

export function GroupUpdateDialog({ reload, group, open, setOpen }: GroupUpdateDialogProps) {
  const { t } = useTranslation()

  const form = useForm({
    defaultValues: {
      name: group.name,
    },
    resolver: zodResolver(
      z.object({
        name: z.string().min(1, { message: "Name must contain at least 1 character(s)" }).max(255, { message: "Name must contain at most 255 character(s)" }),
      })
    ),
  })

  const submit = form.handleSubmit(async values => {
    try {
      const sql = `UPDATE "group" SET name="${values.name}" WHERE id = "${group.id}"`
      await scorix.invoke("ext:gorm:Query", sql)
      toast.success(t("updated"))
      setOpen(false)
      form.reset(values)
      reload()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      form.setError("name", { type: "manual", message: msg })
    }
  })

  return (
    <Dialog open={open} onOpenChange={value => !form.formState.isSubmitting && setOpen(value)}>
      <DialogContent
        className="sm:max-w-[425px]"
        onInteractOutside={e => {
          e.preventDefault()
        }}
        onEscapeKeyDown={e => {
          e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{t("update_group")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => {
                return (
                  <FormItem>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button className="cursor-pointer" variant="outline" disabled={form.formState.isSubmitting}>
                  {t("cancel")}
                </Button>
              </DialogClose>
              <Button className="cursor-pointer" type="submit" disabled={form.formState.isSubmitting}>
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
