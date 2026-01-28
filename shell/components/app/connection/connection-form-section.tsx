"use client"

import { useForm, UseFormReturn } from "react-hook-form"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState } from "react"
import { GroupDO } from "@/types/group.do"
import { toast } from "sonner"
import scorix from "@/lib/scorix"
import { useTranslation } from "react-i18next"

export function ConnectionFormSection({ form }: { form: UseFormReturn }) {
  const { t } = useTranslation()
  const [groups, setGroups] = useState<GroupDO[]>([])

  const network: string = form.watch("network")

  useEffect(() => {
    scorix
      .invoke<GroupDO[]>("ext:gorm:Query", 'SELECT * FROM "group" WHERE deleted_at IS NULL')
      .then(data => setGroups(data || []))
      .catch(e => {
        const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
        toast.error(msg)
      })
  }, [])

  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => {
          return (
            <FormItem>
              <FormLabel className="flex items-center justify-between">Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )
        }}
      />
      <FormField
        control={form.control}
        name="group_id"
        render={({ field }) => {
          return (
            <FormItem>
              <FormLabel className="flex items-center justify-between">{t("group")}</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groups?.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )
        }}
      />
      <FormField
        control={form.control}
        name="network"
        render={({ field }) => {
          return (
            <FormItem>
              <FormLabel className="flex items-center justify-between">Network</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["tcp", "unix"].map(e => (
                      <SelectItem key={e} value={e}>
                        {e.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )
        }}
      />
      {network == "tcp" && (
        <>
          <FormField
            control={form.control}
            name="host"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">Host</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
          <FormField
            control={form.control}
            name="port"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">Port</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" onChange={e => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
        </>
      )}
      {network == "unix" && (
        <FormField
          control={form.control}
          name="sock"
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel className="flex items-center justify-between">Sock</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />
      )}
      <FormField
        control={form.control}
        name="username"
        render={({ field }) => {
          return (
            <FormItem>
              <FormLabel className="flex items-center justify-between">Username</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )
        }}
      />
      <FormField
        control={form.control}
        name="password"
        render={({ field }) => {
          return (
            <FormItem>
              <FormLabel className="flex items-center justify-between">Password</FormLabel>
              <FormControl>
                <Input {...field} type="password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )
        }}
      />
    </>
  )
}
