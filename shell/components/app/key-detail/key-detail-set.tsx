"use client"

import { TableBody, TableCell, TableColumnHeader, TableHead, TableHeader, TableHeaderGroup, TableProvider, TableRow } from "@/components/ui/kibo-ui/table"
import { ColumnDef } from "@tanstack/react-table"
import { SetType } from "@/types/set.type"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { KeyKindEnum } from "@/types/key-kind.enum"
import { toast } from "sonner"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { Form, FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { KeyAddValueSet } from "@/components/app/key-add/key-add-value-set"
import scorix from "@/lib/scorix"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

type KeyDetailSetProps = {
  databaseId: string
  databaseIdx: number
  selectedKey: string
  data: SetType[]
  reload: () => void
}

export function KeyDetailSet(props: KeyDetailSetProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState<boolean>(false)
  const [deletingMember, setDeletingMember] = useState<string | null>(null)

  const columns: ColumnDef<SetType>[] = [
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
        const memberKey = row.original.value
        const isDeleting = deletingMember === memberKey

        return (
          <span
            role="button"
            aria-disabled={isDeleting}
            onClick={() => {
              if (!isDeleting) memberDel(memberKey)
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
      value_set: [" "],
    },
    resolver: zodResolver(
      z.object({
        value_set: z.any().optional(),
      })
    ),
  })

  const submit = form.handleSubmit(async values => {
    try {
      await scorix.invoke("client:key-value-update", {
        connection_id: props.databaseId,
        database_index: props.databaseIdx,
        key_name: props.selectedKey,
        key_kind: KeyKindEnum.SET,
        key_value_set: values.value_set,
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

  const memberDel = async (member: string) => {
    if (deletingMember) return
    setDeletingMember(member)
    try {
      await scorix.invoke("key:set-member-del", {
        connection_id: props.databaseId,
        database_index: props.databaseIdx,
        key: props.selectedKey,
        member: member,
      })
      toast.success(t("deleted"))
      props.reload()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.error(msg)
    } finally {
      setDeletingMember(null)
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
                    <KeyAddValueSet form={form} />
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
