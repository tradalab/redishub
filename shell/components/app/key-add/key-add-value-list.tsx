import { useFieldArray } from "react-hook-form"
import type { UseFormReturn } from "react-hook-form"
import { cn } from "@/lib/utils"
import { FormControl, FormField, FormItem } from "@/components/ui/form"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ArrowDownIcon, ArrowUpIcon, EllipsisVerticalIcon, Trash } from "lucide-react"
import { GridInput } from "@/components/x/grid-input"
import { useTranslation } from "react-i18next"

export function KeyAddValueList({ form }: { form: UseFormReturn }) {
  const { t } = useTranslation()
  const { fields, insert, remove } = useFieldArray({
    control: form.control,
    name: "value_list",
  })

  function deleteRow(index: number) {
    remove(index)

    // If the last row is deleted, add a new blank row
    if (fields.length === 1) {
      insert(0, {
        key: "",
        value: "",
        disabled: false,
      })
    }
  }

  function insertRow(index: number, position: "above" | "below") {
    insert(index + (position === "above" ? 0 : 1), {
      key: "",
      value: "",
      disabled: false,
    })
  }

  return (
    <div className="rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 focus:shadow focus:shadow-blue-300/30 outline-none">
      <div className="bg-ui-bg-subtle grid grid-cols-1 divide-x rounded-t-lg">
        <div className="txt-compact-small-plus text-ui-fg-subtle px-2 py-1.5">
          <label id="list-value-value">Value</label>
        </div>
      </div>
      {fields.map((_, index) => {
        return (
          <div className="group/table relative" key={index}>
            <div
              className={cn("grid grid-cols-1 divide-x", {
                "overflow-hidden rounded-b-lg": index === fields.length - 1,
              })}
            >
              <FormField
                control={form.control}
                name={`value_list.${index}`}
                render={({ field: { value, ...field } }) => {
                  return (
                    <FormItem>
                      <FormControl>
                        <GridInput {...field} aria-labelledby="list-value-value" placeholder="Value" />
                      </FormControl>
                    </FormItem>
                  )
                }}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className={"invisible absolute inset-y-0 -right-2.5 my-auto group-hover/table:visible data-[state='open']:visible"} asChild>
                {/*<IconButton size="2xsmall">*/}
                <EllipsisVerticalIcon />
                {/*</IconButton>*/}
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem className="gap-x-2" onClick={() => insertRow(index, "above")}>
                  <ArrowUpIcon className="text-ui-fg-subtle" />
                  {t("insert_row_above")}
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-x-2" onClick={() => insertRow(index, "below")}>
                  <ArrowDownIcon className="text-ui-fg-subtle" />
                  {t("insert_row_below")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-x-2" onClick={() => deleteRow(index)}>
                  <Trash className="text-ui-fg-subtle" />
                  {t("delete_row")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      })}
    </div>
  )
}
