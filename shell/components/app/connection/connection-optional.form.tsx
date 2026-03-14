"use client"

import { UseFormReturn } from "react-hook-form"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useTranslation } from "react-i18next"

export function ConnectionOptionalForm({ form }: { form: UseFormReturn }) {
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
              <Input type="number" value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
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
              <Input type="number" value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
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
              <Input type="number" value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
