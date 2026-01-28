"use client"

import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useForm } from "react-hook-form"
import { Form } from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { ConnectionDo } from "@/types/connection.do"
import { ConnectionFormSection } from "@/components/app/connection/connection-form-section"
import scorix from "@/lib/scorix"
import { useTranslation } from "react-i18next"

type DatabaseUpdateDialogProps = {
  connection: ConnectionDo
  reload: () => void
  open: boolean
  setOpen: (open: boolean) => void
}

export function ConnectionUpdateDialog({ connection, reload, open, setOpen }: DatabaseUpdateDialogProps) {
  const { t } = useTranslation()

  const form = useForm<any>({
    defaultValues: {
      name: connection.name,
      group_id: connection.group_id || "",
      network: connection.network,
      host: connection.host,
      port: connection.port,
      sock: connection.sock,
      username: connection.username,
      password: connection.password,
    },
    resolver: zodResolver(
      z.object({
        name: z.string().min(1, { message: "Name must contain at least 1 character(s)" }).max(255, { message: "Name must contain at most 255 character(s)" }),
        group_id: z.string().optional(),
        network: z.string(),
        host: z.string().optional(),
        port: z.number().optional(),
        sock: z.string().optional(),
        username: z.string().optional(),
        password: z.string().optional(),
      })
    ),
  })

  const submit = form.handleSubmit(async values => {
    try {
      const sql = `UPDATE "connection" SET name="${values.name}", network="${values.network}", host="${values.host}", port="${values.port}", sock="${values.sock}", username="${values.username}", password="${values.password}", group_id="${values.group_id}" WHERE id="${connection.id}"`
      await scorix.invoke("ext:gorm:Query", sql)
      toast.success(t("updated"))
      setOpen(false)
      form.reset(values)
      reload()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.error(msg)
    }
  })

  return (
    <Dialog open={open} onOpenChange={value => !form.formState.isSubmitting && setOpen(value)}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t("update_connection")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="grid gap-4">
            <ConnectionFormSection form={form} />
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
