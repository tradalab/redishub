import { TableBody, TableCell, TableColumnHeader, TableHead, TableHeader, TableHeaderGroup, TableProvider, TableRow } from "@/components/ui/kibo-ui/table"
import { ColumnDef } from "@tanstack/react-table"
import { StreamType } from "@/types/stream.type"
import scorix from "@/lib/scorix"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Trash2Icon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useState } from "react"

type Props = {
  databaseId: string
  databaseIdx: number
  selectedKey: string
  data: StreamType[]
  reload: () => void
}

export function KeyDetailStream(props: Props) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState<boolean>(false)
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
            onClick={() => {
              if (!isDeleting) entryDel(entryId)
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
  )
}
