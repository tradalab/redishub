"use client"

import { ReactNode, useState } from "react"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useForm } from "react-hook-form"
import { Form } from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ulid } from "ulid"
import scorix from "@/lib/scorix"
import { toast } from "sonner"
import { ConnectionFormSection } from "@/components/app/connection/connection-form-section"
import { useDbStore } from "@/stores/db.store"
import { useTranslation } from "react-i18next"

export function ConnectionAddDialog({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { load } = useDbStore()

  const form = useForm<any>({
    defaultValues: {
      name: "",
      group_id: "",
      network: "tcp",
      host: "127.0.0.1",
      port: 6379,
      sock: "/tmp/redis.sock",
      username: "",
      password: "",
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
      const sql = `INSERT INTO "connection" (id, name, network, host, port, sock, username, password, group_id) VALUES ("${ulid()}", "${values.name}", "${values.network}", "${values.host}", "${values.port}", "${values.sock}", "${values.username}", "${values.password}", "${values.group_id}")`
      await scorix.invoke("ext:gorm:Query", sql)
      toast.success(t("created"))
      setOpen(false)
      form.reset()
      await load()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.error(msg)
    }
  })

  return (
    <Dialog open={open} onOpenChange={value => !form.formState.isSubmitting && setOpen(value)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
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
          <DialogTitle>{t("new_connection")}</DialogTitle>
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
