"use client"

import { TableBody, TableCell, TableColumnHeader, TableHead, TableHeader, TableHeaderGroup, TableProvider, TableRow } from "@/components/ui/kibo-ui/table"
import { ColumnDef } from "@tanstack/react-table"
import { ListType } from "@/types/list.type"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { Form, FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { KeyAddValueList } from "@/components/app/key-add/key-add-value-list"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { KeyKindEnum } from "@/types/key-kind.enum"
import { toast } from "sonner"
import { useState } from "react"
import scorix from "@/lib/scorix"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

type KeyDetailListProps = {
  databaseId: string
  databaseIdx: number
  selectedKey: string
  data: ListType[]
  reload: () => void
}

export function KeyDetailList(props: KeyDetailListProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState<boolean>(false)
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null)

  const columns: ColumnDef<ListType>[] = [
    {
      accessorKey: "id",
      header: ({ column }) => <TableColumnHeader column={column} title="#" />,
      cell: ({ row }) => row.original.id + 1,
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
        const idx = row.original.id
        const isDeleting = deletingIdx === idx

        return (
          <span
            role="button"
            aria-disabled={isDeleting}
            onClick={() => {
              if (!isDeleting) itemDel(idx, row.original.value)
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
    defaultValues: {
      value_list: [" "],
    },
    resolver: zodResolver(
      z.object({
        value_list: z.any().optional(),
      })
    ),
  })

  const submit = form.handleSubmit(async values => {
    try {
      await scorix.invoke("client:key-value-update", {
        connection_id: props.databaseId,
        database_index: props.databaseIdx,
        key_name: props.selectedKey,
        key_kind: KeyKindEnum.LIST,
        key_value_list: values.value_list,
      })
      toast.success(t("updated"))
      props.reload()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  })

  const itemDel = async (idx: number, value: string) => {
    if (deletingIdx) return
    setDeletingIdx(idx)
    try {
      await scorix.invoke("key:list-item-del", {
        connection_id: props.databaseId,
        database_index: props.databaseIdx,
        key: props.selectedKey,
        value: value,
        idx: idx,
      })
      toast.success(t("deleted"))
      props.reload()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.error(msg)
    } finally {
      setDeletingIdx(null)
    }
  }

  return (
    <>
      <div>
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
                  <DrawerDescription></DrawerDescription>
                </DrawerHeader>
                <FormItem>
                  <FormLabel className="flex items-center justify-between">Value</FormLabel>
                  <FormControl>
                    <KeyAddValueList form={form} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
                <DrawerFooter>
                  <div className="flex items-right">
                    <Button size="sm" type="submit" disabled={loading}>
                      {t("save")}
                    </Button>
                    <DrawerClose>
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
      </div>
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
