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
import { PlusIcon } from "lucide-react"
import { Form, FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { KeyAddValueSet } from "@/components/app/key-add/key-add-value-set"
import scorix from "@/lib/scorix"

type KeyDetailSetProps = {
  databaseId: string
  databaseIdx: number
  selectedKey: string
  data: SetType[]
  reload: () => void
}

export function KeyDetailSet(props: KeyDetailSetProps) {
  const [loading, setLoading] = useState<boolean>(false)

  const columns: ColumnDef<SetType>[] = [
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
        database_id: props.databaseId,
        database_index: props.databaseIdx,
        key_name: props.selectedKey,
        key_kind: KeyKindEnum.SET,
        key_value_set: values.value_set,
      })
      toast.success("Updated!")
      props.reload()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  })

  return (
    <>
      <div>
        <Drawer direction="right">
          <DrawerTrigger asChild>
            <Button size="sm">
              <PlusIcon />
              Insert Row
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <Form {...form}>
              <form onSubmit={submit} className="grid gap-4">
                <DrawerHeader>
                  <DrawerTitle>New Field</DrawerTitle>
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
                      Save
                    </Button>
                    <DrawerClose>
                      <Button size="sm" variant="outline">
                        Cancel
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
