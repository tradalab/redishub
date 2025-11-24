import { TableBody, TableCell, TableColumnHeader, TableHead, TableHeader, TableHeaderGroup, TableProvider, TableRow } from "@/components/ui/kibo-ui/table"
import { ColumnDef } from "@tanstack/react-table"
import { StreamType } from "@/types/stream.type"

export function KeyDetailStream({ data }: { data: StreamType[] }) {
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
  ]

  return (
    <TableProvider columns={columns} data={data}>
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
