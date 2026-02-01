"use client"

import { useState } from "react"
import { TableBody, TableCell, TableColumnHeader, TableHead, TableHeader, TableHeaderGroup, TableProvider, TableRow } from "@/components/ui/kibo-ui/table"
import { ColumnDef } from "@tanstack/react-table"
import { StreamType } from "@/types/stream.type"
import scorix from "@/lib/scorix"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useConfirm } from "@/components/ui/trada-ui/confirm/use-confirm"
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { KeyKindEnum } from "@/types/key-kind.enum"
import { KeyAddValueStream } from "@/components/app/key-add/key-add-value-stream"

type Props = {
  databaseId: string
  databaseIdx: number
  selectedKey: string
  data: StreamType[]
  reload: () => void
}

const schema = z.object({
  value_stream: z.any().optional(),
})

export function KeyDetailStream(props: Props) {
  const { t } = useTranslation()
  const confirm = useConfirm()

  const [loading, setLoading] = useState(false)
  const [deletingEntry, setDeletingEntry] = useState<string | null>(null)

  const columns: ColumnDef<StreamType>[] = [
    {
      accessorKey: "id",
      header: ({ column }) => <TableColumnHeader column={column} title="#" />,
      cell: ({ row }) => row.original.id,
    },
    {
      accessorKey: "value",
      header: ({ column }) => <TableColumnHeader column={column} title="Value" />,
      cell: ({ row }) => row.original.value,
    },
    {
      accessorKey: "action",
      enableSorting: false,
      size: 12,
      header: ({ column }) => <TableColumnHeader column={column} title="" />,
      cell: ({ row }) => {
        const entryId = row.original.id
        const isDeleting = deletingEntry === entryId

        return (
          <span
            role="button"
            aria-disabled={isDeleting}
            onClick={async () => {
              if (isDeleting) return
              const ok = await confirm({
                title: t("confirm_delete"),
                description: t("confirm_delete_desc", { obj_name: "entry", obj_key: entryId }),
                confirmText: t("delete"),
                danger: true,
              })
              if (ok) {
                await entryDel(entryId)
              }
            }}
            className={cn(
              "inline-flex items-center justify-center",
              "w-5 h-5 cursor-pointer",
              "text-red-600 hover:text-red-700",
              isDeleting && "cursor-not-allowed opacity-50"
            )}
          >
            {isDeleting ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            ) : (
              <Trash2Icon className="h-4 w-4" />
            )}
          </span>
        )
      },
    },
  ]

  const form = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: {
      value_stream: {},
    },
  })

  const submit = form.handleSubmit(async values => {
    setLoading(true)
    try {
      await scorix.invoke("client:key-value-update", {
        connection_id: props.databaseId,
        database_index: props.databaseIdx,
        key_name: props.selectedKey,
        key_kind: KeyKindEnum.STREAM,
        key_value_stream: {
          id: "*",
          value: Object.fromEntries(values.value_stream?.filter((i: any) => i?.field !== "")?.map((i: any) => [i?.field, i?.value])),
        },
      })

      toast.success(t("saved"))
      form.reset({ value_stream: {} })
      props.reload()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  })

  const entryDel = async (id: string) => {
    if (deletingEntry) return
    setDeletingEntry(id)
    try {
      await scorix.invoke("key:stream-entry-del", {
        connection_id: props.databaseId,
        database_index: props.databaseIdx,
        key: props.selectedKey,
        entry_id: id,
      })
      toast.success(t("deleted"))
      props.reload()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.error(msg)
    } finally {
      setDeletingEntry(null)
    }
  }

  return (
    <>
      <Drawer direction="right">
        <DrawerTrigger asChild>
          <Button size="sm" variant="outline" className="mb-2">
            <PlusIcon />
            {t("insert_row")}
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <Form {...form}>
            <form onSubmit={submit} className="grid gap-4">
              <DrawerHeader>
                <DrawerTitle>{t("new_field")}</DrawerTitle>
              </DrawerHeader>
              <FormItem>
                <FormLabel className="flex items-center justify-between">Value</FormLabel>
                <FormControl>
                  <KeyAddValueStream form={form} />
                </FormControl>
                <FormMessage />
              </FormItem>
              <DrawerFooter>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" type="submit" disabled={loading}>
                    {loading ? t("saving") : t("save")}
                  </Button>
                  <DrawerClose asChild>
                    <Button size="sm" variant="outline">
                      {t("cancel")}
                    </Button>
                  </DrawerClose>
                </div>
              </DrawerFooter>
            </form>
          </Form>
        </DrawerContent>
      </Drawer>

      <TableProvider columns={columns} data={props.data}>
        <TableHeader>
          {({ headerGroup }) => (
            <TableHeaderGroup headerGroup={headerGroup} key={headerGroup.id}>
              {({ header }) => <TableHead header={header} key={header.id} />}
            </TableHeaderGroup>
          )}
        </TableHeader>
        <TableBody>
          {({ row }) => (
            <TableRow key={row.id} row={row}>
              {({ cell }) => <TableCell cell={cell} key={cell.id} />}
            </TableRow>
          )}
        </TableBody>
      </TableProvider>
    </>
  )
}
