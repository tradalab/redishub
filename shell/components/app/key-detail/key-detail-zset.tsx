"use client"

import { DataTable } from "@tradalab/lyra/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { ZsetType } from "@/types/zset.type"
import { useKeyValuePage } from "@/hooks/use-key-value-page"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { KeyKindEnum } from "@/types/key-kind.enum"
import { toast } from "sonner"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@tradalab/lyra/ui"
import { Button } from "@tradalab/lyra/ui"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { Form } from "@tradalab/lyra/blocks"
import { Spinner } from "@tradalab/lyra/ui"
import { KeyAddValueZset } from "@/components/app/key-add/key-add-value-zset"
import { useKeyCreate } from "@/hooks/api/client.api"
import { useZsetMemberDel } from "@/hooks/api/key.api"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { useConfirm } from "@tradalab/lyra/blocks"
import { CellText } from "@/components/app/key-detail/key-detail-shared"

type KeyDetailZsetProps = {
  databaseId: string
  databaseIdx: number
  selectedKey: string
  reloadToken: number
  reload: () => void
  readOnly?: boolean
}

export function KeyDetailZset(props: KeyDetailZsetProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState<boolean>(false)
  const [deletingMember, setDeletingMember] = useState<string | null>(null)
  const confirm = useConfirm()
  const { items, isLoading, isFetchingNextPage, hasMore, fetchNextPage } = useKeyValuePage(
    props.databaseId,
    props.databaseIdx,
    props.selectedKey,
    "zset",
    props.reloadToken
  )
  const createMutation = useKeyCreate(props.databaseId, props.databaseIdx)
  const delMutation = useZsetMemberDel(props.databaseId, props.databaseIdx)

  const columns: ColumnDef<ZsetType>[] = [
    {
      accessorKey: "id",
      header: "#",
      cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{row.original.id + 1}</span>,
    },
    {
      accessorKey: "member",
      header: "Member",
      cell: ({ row }) => <CellText>{row.original.member}</CellText>,
    },
    {
      accessorKey: "score",
      header: "Score",
      cell: ({ row }) => <CellText className="tabular-nums">{row.original.score}</CellText>,
    },
    {
      id: "action",
      header: "",
      cell: ({ row }) => {
        if (props.readOnly) return null
        const memberKey = row.original.member
        const isDeleting = deletingMember === memberKey

        return (
          <div className="flex justify-end">
            <span
              role="button"
              aria-disabled={isDeleting}
              onClick={async () => {
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
                "h-5 w-5 cursor-pointer",
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
          </div>
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
    setLoading(true)
    try {
      await createMutation.mutateAsync({
        connection_id: props.databaseId,
        database_index: props.databaseIdx,
        key: props.selectedKey,
        kind: KeyKindEnum.ZSET,
        ttl: -1,
        value_string: "",
        value_json: "",
        value_zset: values.value_zset,
        value_stream: { id: "", values: "" },
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
      await delMutation.mutateAsync({
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
        {props.readOnly ? (
          <Button size="sm" variant="outline" className="mb-2" disabled title={t("read_only_blocked")}>
            <PlusIcon />
            {t("insert_row")}
          </Button>
        ) : (
          <Drawer direction="right">
            <DrawerTrigger asChild>
              <Button size="sm" variant="outline" className="mb-2">
                <PlusIcon />
                {t("insert_row")}
              </Button>
            </DrawerTrigger>
            <DrawerContent className="sm:max-w-lg">
              <Form {...form}>
                <form onSubmit={submit} className="flex h-full flex-col">
                  <DrawerHeader>
                    <DrawerTitle>{t("new_field")}</DrawerTitle>
                    <DrawerDescription>{t("insert_row_desc")}</DrawerDescription>
                  </DrawerHeader>
                  {/* Editor owns its own FormFields; this is just a scroll region. */}
                  <div className="min-h-0 flex-1 overflow-y-auto px-4">
                    <KeyAddValueZset form={form} />
                  </div>
                  <DrawerFooter className="flex-row justify-end">
                    <DrawerClose asChild>
                      <Button size="sm" variant="outline" type="button">
                        {t("cancel")}
                      </Button>
                    </DrawerClose>
                    <Button size="sm" type="submit" disabled={loading}>
                      {loading && <Spinner />}
                      {t("save")}
                    </Button>
                  </DrawerFooter>
                </form>
              </Form>
            </DrawerContent>
          </Drawer>
        )}
      </div>
      <DataTable
        columns={columns}
        data={items as ZsetType[]}
        className="border-0"
        loading={isLoading}
        loadingText={t("loading")}
        emptyText={t("no_items")}
        onLoadMore={fetchNextPage}
        hasMore={hasMore}
        loadingMore={isFetchingNextPage}
        loadingMoreText={t("loading")}
      />
    </>
  )
}
