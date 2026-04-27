"use client"

import { UseFormReturn } from "react-hook-form"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/trada-ui/form"
import { Input } from "@/components/ui/input"
import { useTranslation } from "react-i18next"

export function ConnectionOptionalForm({ form }: { form: UseFormReturn<any> }) {
  const { t } = useTranslation()

  return (
    <>
      <FormField
        control={form.control}
        name="exec_timeout"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("exec_timeout")}</FormLabel>
            <FormControl>
              <Input type="number" {...field} onChange={e => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="dial_timeout"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("dial_timeout")}</FormLabel>
            <FormControl>
              <Input type="number" {...field} onChange={e => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="key_size"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("key_size")}</FormLabel>
            <FormControl>
              <Input type="number" {...field} onChange={e => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="pt-4 space-y-4">
        <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{t("advanced")}</div>
        <FormField
          control={form.control}
          name="addr_mapping"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("addr_mapping")}</FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="172.18.0.2:6379=127.0.0.1:8001"
                />
              </FormControl>
              <p className="text-[11px] text-muted-foreground leading-tight">{t("addr_mapping_help")}</p>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  )
}
