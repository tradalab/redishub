"use client"

import { UseFormReturn } from "react-hook-form"
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "react-i18next"
import { useGroupList } from "@/hooks/api/group.api"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"

export function ConnectionGeneralForm({ form }: { form: UseFormReturn }) {
  const { t } = useTranslation()
  const { data: groups = [] } = useGroupList()

  const mode: string = form.watch("mode") || "standalone"
  const network: string = form.watch("network")

  return (
    <div className="space-y-6 px-1 py-1">
      <div className="space-y-4">
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
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="mode"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">{t("mode")}</FormLabel>
                  <FormControl>
                    <Select value={field.value || "standalone"} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standalone">{t("standalone")}</SelectItem>
                        <SelectItem value="sentinel">{t("sentinel")}</SelectItem>
                        <SelectItem value="cluster">{t("cluster")}</SelectItem>
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
            name="name"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">{t("name")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Project Alpha" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
        </div>
      </div>

      <Separator />

      {mode == "standalone" && (
        <div className="space-y-4">
          <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{t("instance_settings")}</div>
          <FormField
            control={form.control}
            name="network"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">Network</FormLabel>
                  <FormControl>
                    <Select value={field.value || "tcp"} onValueChange={field.onChange}>
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
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3">
                <FormField
                  control={form.control}
                  name="host"
                  render={({ field }) => {
                    return (
                      <FormItem>
                        <FormLabel className="flex items-center justify-between">Host</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="127.0.0.1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />
              </div>
              <div className="col-span-1">
                <FormField
                  control={form.control}
                  name="port"
                  render={({ field }) => {
                    return (
                      <FormItem>
                        <FormLabel className="flex items-center justify-between">Port</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            placeholder="6379"
                            onChange={e => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />
              </div>
            </div>
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
                      <Input {...field} placeholder="/tmp/redis.sock" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
          )}
        </div>
      )}

      {mode == "sentinel" && (
        <div className="space-y-4">
          <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{t("sentinel_settings")}</div>
          <FormField
            control={form.control}
            name="sentinel_master"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">{t("sentinel_master")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="mymaster" />
                  </FormControl>
                  <FormDescription className="text-[11px] leading-tight">{t("sentinel_master_help")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
          <FormField
            control={form.control}
            name="addrs"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">{t("addrs")}</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder={t("addrs_placeholder")} className="min-h-[80px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sentinel_username"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">{t("sentinel_username")}</FormLabel>
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
                name="sentinel_password"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">{t("sentinel_password")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
            </div>
            <FormDescription className="text-[11px] leading-tight mt-1">{t("sentinel_auth_help")}</FormDescription>
          </div>
        </div>
      )}

      {mode == "cluster" && (
        <div className="space-y-4">
          <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{t("cluster_settings")}</div>
          <FormField
            control={form.control}
            name="addrs"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">{t("addrs")}</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder={t("addrs_placeholder")} className="min-h-[100px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
        </div>
      )}

      <Separator />

      <div className="space-y-4">
        <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{t("master_credentials")}</div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">{t("username")}</FormLabel>
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
                  <FormLabel className="flex items-center justify-between">{t("password")}</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
        </div>
        <FormDescription className="text-[11px] leading-tight">{t("master_credentials_help")}</FormDescription>
      </div>
    </div>
  )
}
