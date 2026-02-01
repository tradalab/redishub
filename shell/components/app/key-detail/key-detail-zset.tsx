"use client"

import { TableBody, TableCell, TableColumnHeader, TableHead, TableHeader, TableHeaderGroup, TableProvider, TableRow } from "@/components/ui/kibo-ui/table"
import { ColumnDef } from "@tanstack/react-table"
import { ZsetType } from "@/types/zset.type"
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
import { KeyAddValueZset } from "@/components/app/key-add/key-add-value-zset"
import scorix from "@/lib/scorix"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { useConfirm } from "@/components/ui/trada-ui/confirm/use-confirm"

type KeyDetailZsetProps = {
  databaseId: string
  databaseIdx: number
  selectedKey: string
  data: ZsetType[]
  reload: () => void
}

export function KeyDetailZset(props: KeyDetailZsetProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState<boolean>(false)
  const [deletingMember, setDeletingMember] = useState<string | null>(null)
  const confirm = useConfirm()

  const columns: ColumnDef<ZsetType>[] = [
    {
      accessorKey: "id",
      header: ({ column }) => <TableColumnHeader column={column} title="#" />,
      cell: ({ row }) => row.original.id + 1,
    },
    {
      accessorKey: "member",
      header: ({ column }) => <TableColumnHeader column={column} title="Member" />,
      cell: ({ row }) => row.original.member,
    },
    {
      accessorKey: "score",
      header: ({ column }) => <TableColumnHeader column={column} title="Score" />,
      cell: ({ row }) => row.original.score,
    },
    {
      accessorKey: "action",
      enableSorting: false,
      size: 12,
      header: ({ column }) => <TableColumnHeader column={column} title="" />,
      cell: ({ row }) => {
        const memberKey = row.original.member
        const isDeleting = deletingMember === memberKey

        return (
          <span
            role="button"
            aria-disabled={isDeleting}
            onClick={async e => {
              if (isDeleting) return
              const ok = await confirm({
                title: t("confirm_delete"),
                description: t("confirm_delete_desc", { obj_name: "member", obj_key: memberKey }),
                confirmText: t("delete"),
                danger: true,
              })
              if (ok) {
                await memberDel(memberKey)
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
    defaultValues: {
      value_zset: [{ member: "", score: 0 }],
    },
    resolver: zodResolver(
      z.object({
        value_zset: z.any().optional(),
      })
    ),
  })

  const submit = form.handleSubmit(async values => {
    try {
      await scorix.invoke("client:key-value-update", {
        connection_id: props.databaseId,
        database_index: props.databaseIdx,
        key_name: props.selectedKey,
        key_kind: KeyKindEnum.ZSET,
        key_value_zset: values.value_zset,
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
      await scorix.invoke("key:zset-member-del", {
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
                    <KeyAddValueZset form={form} />
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
