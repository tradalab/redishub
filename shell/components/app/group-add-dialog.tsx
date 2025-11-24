"use client"

import { ReactNode, useState } from "react"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useForm } from "react-hook-form"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ulid } from "ulid"
import { toast } from "sonner"
import scorix from "@/lib/scorix"

export function GroupAddDialog({ children, reload }: { children: ReactNode; reload: () => void }) {
  const [open, setOpen] = useState(false)

  const form = useForm({
    defaultValues: {
      name: "",
    },
    resolver: zodResolver(
      z.object({
        name: z.string().min(1, { message: "Name must contain at least 1 character(s)" }).max(255, { message: "Name must contain at most 255 character(s)" }),
      })
    ),
  })

  const submit = form.handleSubmit(async values => {
    try {
      const sql = `INSERT INTO "group" (id, name) VALUES ("${ulid()}", "${values.name}")`
      await scorix.invoke("ext:gorm:Query", sql)
      toast.success("Created!")
      setOpen(false)
      form.reset()
      reload()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"
      form.setError("name", { type: "manual", message: msg })
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
          <DialogTitle>New Group</DialogTitle>
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
