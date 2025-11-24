"use client"

import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useForm } from "react-hook-form"
import { Form } from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { DatabaseDO } from "@/types/database.do"
import { DatabaseForm } from "@/components/app/database-form"
import scorix from "@/lib/scorix"

type DatabaseUpdateDialogProps = {
  database: DatabaseDO
  reload: () => void
  open: boolean
  setOpen: (open: boolean) => void
}

export function DatabaseUpdateDialog({ database, reload, open, setOpen }: DatabaseUpdateDialogProps) {
  const form = useForm<any>({
    defaultValues: {
      name: database.name,
      group_id: database.group_id || "",
      network: database.network,
      host: database.host,
      port: database.port,
      sock: database.sock,
      username: database.username,
      password: database.password,
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
      const sql = `UPDATE "database" SET name="${values.name}", network="${values.network}", host="${values.host}", port="${values.port}", sock="${values.sock}", username="${values.username}", password="${values.password}", group_id="${values.group_id}" WHERE id="${database.id}"`
      await scorix.invoke("ext:gorm:Query", sql)
      toast.success("Updated!")
      setOpen(false)
      form.reset(values)
      reload()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"
      toast.error(msg)
    }
  })

  return (
    <Dialog open={open} onOpenChange={value => !form.formState.isSubmitting && setOpen(value)}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Update Database</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="grid gap-4">
            <DatabaseForm form={form} />
            <DialogFooter>
              <DialogClose asChild>
                <Button className="cursor-pointer" variant="outline" disabled={form.formState.isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button className="cursor-pointer" type="submit" disabled={form.formState.isSubmitting}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
