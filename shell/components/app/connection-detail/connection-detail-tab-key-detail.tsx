"use client"

import { ReactNode, useEffect, useMemo, useState } from "react"
import { useTabStore } from "@/stores/tab.store"
import { toast } from "sonner"
import { CodeEditor } from "@/components/x/code-editor"
import { KeyDetailHash } from "@/components/app/key-detail/key-detail-hash"
import { KeyDetailList } from "@/components/app/key-detail/key-detail-list"
import { KeyDetailSet } from "@/components/app/key-detail/key-detail-set"
import { KeyDetailZset } from "@/components/app/key-detail/key-detail-zset"
import { KeyDetailStream } from "@/components/app/key-detail/key-detail-stream"
import { KeyDetailString } from "@/components/app/key-detail/key-detail-string"
import { Input } from "@/components/ui/input"
import { RefreshCcwIcon, SaveIcon, TimerIcon, Trash2Icon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/trada-ui/form"
import { Button } from "@/components/ui/button"
import { useKeyDelete, useKeyDetail, useKeyNameUpdate, useKeyTtlUpdate } from "@/hooks/api/client.api"
import { useReadOnly } from "@/hooks/api/connection.api"
import { Spinner } from "@/components/ui/spinner"
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group"
import { Label } from "@/components/ui/label"
import { useTranslation } from "react-i18next"
import { useConfirm } from "@/components/ui/trada-ui/confirm/use-confirm"

export function ConnectionDetailTabKeyDetail({ connectionId, databaseIdx, selectedKey }: { connectionId: string; databaseIdx: number; selectedKey?: string }) {
  const { t } = useTranslation()
  const [reloadToken, setReloadToken] = useState<number>(0)
  const confirm = useConfirm()

  const [newKeyName, setNewKeyName] = useState<string | undefined>()
  const [loading, setLoading] = useState<boolean>(false)

  const { updateTab, removeTab, tabs, activeTabId } = useTabStore()
  void tabs

  const readOnly = useReadOnly(connectionId)

  const query = useKeyDetail(connectionId, databaseIdx, selectedKey)
  const detail = query.data

  const { kind, displayValue } = useMemo(() => {
    if (!detail) return { kind: undefined as string | undefined, displayValue: undefined as string | undefined }
    const k = detail.kind
    const v = detail.value
    if (k === "string" && typeof v === "string" && (v.startsWith("{") || v.startsWith("["))) {
      try {
        return { kind: "json", displayValue: JSON.stringify(JSON.parse(v), null, 2) }
      } catch {}
    }
    return { kind: k, displayValue: v }
  }, [detail])

  const ttl = detail?.ttl

  const updateKeyMutation = useKeyNameUpdate(connectionId, databaseIdx)
  const deleteKeyMutation = useKeyDelete(connectionId, databaseIdx)

  useEffect(() => {
    setNewKeyName(undefined)
  }, [selectedKey])

  useEffect(() => {
    if (query.error) {
      const msg = query.error instanceof Error ? query.error.message : t("unknown_error")
      toast.error(msg)
    }
  }, [query.error, t])

  const updateKeyName = async () => {
    if (!newKeyName || !selectedKey || !activeTabId) return
    try {
      await updateKeyMutation.mutateAsync({
        connection_id: connectionId,
        database_index: databaseIdx,
        current_name: selectedKey,
        new_name: newKeyName,
      })
      updateTab(activeTabId, { key: newKeyName, title: newKeyName })
      toast.success(t("updated"))
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : t("unknown_error"))
    }
  }

  const reload = () => {
    query.refetch()
    setReloadToken(t => t + 1)
  }

  const handleDelete = async (key: string) => {
    if (deleteKeyMutation.isPending) return
    const ok = await confirm({
      title: t("confirm_delete"),
      description: t("confirm_delete_desc", { obj_name: "key", obj_key: selectedKey }),
      confirmText: t("delete"),
      danger: true,
    })
    if (ok && activeTabId) {
      try {
        await deleteKeyMutation.mutateAsync({ connection_id: connectionId, database_index: databaseIdx, key })
        removeTab(activeTabId)
        toast.success(t("deleted"))
      } catch (e: any) {
        toast.error(e instanceof Error ? e.message : t("unknown_error"))
      }
    }
  }

  if (query.isLoading) {
    return (
      <div className="h-full w-full flex justify-center items-center">
        <Spinner />
      </div>
    )
  }

  if (!connectionId || !selectedKey || ttl === undefined) {
    return null
  }

  return (
    <div className="flex flex-col min-h-0 gap-2 w-full h-full">
      <div className="flex w-full items-center justify-between gap-2 shrink-0">
        <ButtonGroup className="w-full">
          <ButtonGroupText asChild>
            <Label htmlFor="url">{kind?.toUpperCase()}</Label>
          </ButtonGroupText>
          <Input value={newKeyName || selectedKey} onChange={e => setNewKeyName(e.target.value)} disabled={readOnly} />
          <Button
            variant="outline"
            aria-label="Save"
            className={cn("", { "cursor-pointer": !!newKeyName })}
            disabled={!newKeyName || readOnly}
            onClick={() => updateKeyName()}
          >
            <SaveIcon />
          </Button>
        </ButtonGroup>
        <div className="flex gap-3.5 items-center justify-center">
          {readOnly ? (
            <div className="relative w-full" title={t("read_only_blocked")}>
              <TimerIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-gray-400" size={18} />
              <Input className="pl-10" placeholder="TTL" value={ttl} disabled />
            </div>
          ) : (
            <KeyTtlUpdateDialog reload={reload} databaseId={connectionId} databaseIdx={databaseIdx} keyName={selectedKey} keyTtl={ttl}>
              <div className="relative w-full cursor-pointer">
                <TimerIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-gray-400" size={18} />
                <Input className="pl-10" placeholder="TTL" value={ttl} disabled />
              </div>
            </KeyTtlUpdateDialog>
          )}
          <Button size="icon-sm" variant="outline" onClick={reload}>
            <RefreshCcwIcon />
          </Button>
          <Button size="icon-sm" variant="outline" disabled={readOnly} title={readOnly ? t("read_only_blocked") : undefined} onClick={() => handleDelete(selectedKey)}>
            <Trash2Icon />
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <ViewKeyData
          databaseId={connectionId}
          databaseIdx={databaseIdx}
          kind={kind}
          selectedKey={selectedKey}
          value={displayValue}
          reloadToken={reloadToken}
          loading={loading}
          setLoading={setLoading}
          reload={reload}
          readOnly={readOnly}
        />
      </div>
    </div>
  )
}

type ViewKeyDataProps = {
  databaseId: string
  databaseIdx: number
  selectedKey: string
  loading: boolean
  setLoading: (value: boolean) => void
  value: any
  kind?: string
  reloadToken: number
  reload: () => void
  readOnly?: boolean
}

function ViewKeyData({ kind, value, databaseId, databaseIdx, selectedKey, reloadToken, reload, readOnly }: ViewKeyDataProps) {
  switch (kind) {
    case "string":
      return <KeyDetailString databaseId={databaseId} databaseIdx={databaseIdx} selectedKey={selectedKey} data={value} reload={reload} readOnly={readOnly} />
    case "json":
      return <CodeEditor value={value} language="json" autoFormat={true} defaultHeight={400} options={{ readOnly: true, minimap: { enabled: false } }} />
    case "list":
      return <KeyDetailList databaseId={databaseId} databaseIdx={databaseIdx} selectedKey={selectedKey} reload={reload} reloadToken={reloadToken} readOnly={readOnly} />
    case "hash":
      return <KeyDetailHash databaseId={databaseId} databaseIdx={databaseIdx} selectedKey={selectedKey} reload={reload} reloadToken={reloadToken} readOnly={readOnly} />
    case "set":
      return <KeyDetailSet databaseId={databaseId} databaseIdx={databaseIdx} selectedKey={selectedKey} reload={reload} reloadToken={reloadToken} readOnly={readOnly} />
    case "zset":
      return <KeyDetailZset databaseId={databaseId} databaseIdx={databaseIdx} selectedKey={selectedKey} reload={reload} reloadToken={reloadToken} readOnly={readOnly} />
    case "stream":
      return <KeyDetailStream databaseId={databaseId} databaseIdx={databaseIdx} selectedKey={selectedKey} reload={reload} reloadToken={reloadToken} readOnly={readOnly} />
    case "rejson-rl":
      return <div></div>
    default:
      return null
  }
}

type KeyTtlUpdateDialogProps = {
  children: ReactNode
  reload: () => void
  databaseId: string
  databaseIdx: number
  keyName: string
  keyTtl: number
}

function KeyTtlUpdateDialog({ children, reload, databaseId, databaseIdx, keyName, keyTtl }: KeyTtlUpdateDialogProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ttlMutation = useKeyTtlUpdate(databaseId, databaseIdx)

  const form = useForm<any>({
    defaultValues: { ttl: keyTtl },
    resolver: zodResolver(z.object({ ttl: z.number().min(-1) })),
  })

  const submit = form.handleSubmit(async values => {
    try {
      await ttlMutation.mutateAsync({
        connection_id: databaseId,
        database_index: databaseIdx,
        key_name: keyName,
        key_ttl: values.ttl,
      })
      toast.success(t("updated"))
      setOpen(false)
      form.reset()
      reload()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.error(msg)
    }
  })

  return (
    <Dialog open={open} onOpenChange={value => !form.formState.isSubmitting && setOpen(value)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-sm">{t("update_ttl")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="grid gap-4">
            <FormField
              control={form.control}
              name="ttl"
              render={({ field }) => {
                return (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">TTL</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" onChange={e => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button className="cursor-pointer" variant="outline" disabled={form.formState.isSubmitting}>
                  {t("cancel")}
                </Button>
              </DialogClose>
              <Button className="cursor-pointer" type="submit" disabled={form.formState.isSubmitting}>
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
