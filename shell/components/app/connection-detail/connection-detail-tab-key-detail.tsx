"use client"

import { ReactNode, useEffect, useState } from "react"
import { toast } from "sonner"
import { CodeEditor } from "@/components/x/code-editor"
import { KeyDetailHash } from "@/components/app/key-detail/key-detail-hash"
import { HashType } from "@/types/hash.type"
import { KeyDetailList } from "@/components/app/key-detail/key-detail-list"
import { KeyDetailSet } from "@/components/app/key-detail/key-detail-set"
import { KeyDetailZset } from "@/components/app/key-detail/key-detail-zset"
import { KeyDetailStream } from "@/components/app/key-detail/key-detail-stream"
import { KeyDetailString } from "@/components/app/key-detail/key-detail-string"
import { Input } from "@/components/ui/input"
import { RefreshCcwIcon, SaveIcon, TimerIcon, Trash2Icon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppContext } from "@/ctx/app.context"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import scorix from "@/lib/scorix"
import { useRedisKeys } from "@/hooks/use-redis-keys"
import { Spinner } from "@/components/ui/spinner"
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group"
import { Label } from "@/components/ui/label"
import { useTranslation } from "react-i18next"

export function ConnectionDetailTabKeyDetail({ connectionId, databaseIdx, selectedKey }: { connectionId: string; databaseIdx: number; selectedKey?: string }) {
  const { t } = useTranslation()
  const [data, setData] = useState<string | undefined>("")
  const [kind, setKind] = useState<string | undefined>()
  const [ttl, setTtl] = useState<number | undefined>()

  const [newKeyName, setNewKeyName] = useState<string | undefined>()
  const [loading, setLoading] = useState<boolean>(false)

  const { setSelectedKey } = useAppContext()
  const { updateKey, deleteKey } = useRedisKeys(connectionId || "", databaseIdx)

  const load = async (selectedKey?: string) => {
    if (!selectedKey) {
      return
    }
    setNewKeyName(undefined)
    try {
      setLoading(true)
      const { value, kind, ttl } = await scorix.invoke<{ value: any; kind: string; ttl: number }>("client:load-key-detail", {
        connection_id: connectionId,
        database_index: databaseIdx,
        key: selectedKey,
      })
      setTtl(ttl)
      setKind(kind)
      switch (kind) {
        case "string": {
          const val = value as string
          if (val.startsWith("{") || val.startsWith("[")) {
            try {
              setData(JSON.stringify(JSON.parse(val), null, 2))
              setKind("json")
              return
            } catch (_) {}
          }
          setData(val)
          break
        }
        case "list":
          setData(value)
          break
        case "hash":
          setData(value)
          break
        case "set":
          setData(value)
          break
        case "zset":
          setData(value)
          break
        case "stream":
          setData(value)
          break
        case "rejson-rl":
          setData(value)
          break
      }
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const updateKeyName = async () => {
    if (!newKeyName || !selectedKey) {
      return
    }
    updateKey(selectedKey, newKeyName).then(() => {
      setSelectedKey(newKeyName)
    })
  }

  const reload = () => {
    load(selectedKey)
  }

  useEffect(() => {
    load(selectedKey)
  }, [selectedKey])

  if (!connectionId || !selectedKey || !ttl) {
    return null
  }

  if (loading) {
    return (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-0 gap-2 w-full h-full">
      <div className="flex w-full items-center justify-between gap-2 shrink-0">
        <ButtonGroup className="w-full">
          <ButtonGroupText asChild>
            <Label htmlFor="url">{kind?.toUpperCase()}</Label>
          </ButtonGroupText>
          <Input value={newKeyName || selectedKey} onChange={e => setNewKeyName(e.target.value)} />
          <Button
            variant="outline"
            aria-label="Save"
            className={cn("", { "cursor-pointer": !!newKeyName })}
            disabled={!newKeyName}
            onClick={() => updateKeyName()}
          >
            <SaveIcon />
          </Button>
        </ButtonGroup>
        <div className="flex gap-3.5 items-center justify-center">
          <KeyTtlUpdateDialog reload={() => load(selectedKey)} databaseId={connectionId} databaseIdx={databaseIdx} keyName={selectedKey} keyTtl={ttl}>
            <div className="relative w-full cursor-pointer">
              <TimerIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-gray-400" size={18} />
              <Input className="pl-10" placeholder="TTL" value={ttl} disabled />
            </div>
          </KeyTtlUpdateDialog>
          <Button size="icon-sm" variant="outline" onClick={() => load(selectedKey)}>
            <RefreshCcwIcon />
          </Button>
          <Button size="icon-sm" variant="outline" onClick={() => deleteKey(selectedKey).then(() => setSelectedKey())}>
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
          value={data}
          loading={loading}
          setLoading={setLoading}
          reload={reload}
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
  reload: () => void
}

function ViewKeyData({ kind, value, databaseId, databaseIdx, selectedKey, loading, setLoading, reload }: ViewKeyDataProps) {
  switch (kind) {
    case "string":
      return <KeyDetailString databaseId={databaseId} databaseIdx={databaseIdx} selectedKey={selectedKey} data={value} reload={reload} />
    case "json":
      return <CodeEditor value={value} language="json" autoFormat={true} defaultHeight={400} options={{ readOnly: true, minimap: { enabled: false } }} />
    case "list":
      if (!Array.isArray(value)) {
        return null
      }
      return (
        <KeyDetailList
          databaseId={databaseId}
          databaseIdx={databaseIdx}
          selectedKey={selectedKey}
          reload={reload}
          data={value?.map((item: string, idx: number) => ({ id: idx, value: item }))}
        />
      )
    case "hash":
      if (typeof value !== "object") {
        return null
      }
      return (
        <KeyDetailHash
          databaseId={databaseId}
          databaseIdx={databaseIdx}
          selectedKey={selectedKey}
          reload={reload}
          data={Object.entries(value)?.map(([k, v], index) => ({ id: index, key: k, value: v }) as HashType)}
        />
      )
    case "set":
      if (!Array.isArray(value)) {
        return null
      }
      return (
        <KeyDetailSet
          databaseId={databaseId}
          databaseIdx={databaseIdx}
          selectedKey={selectedKey}
          reload={reload}
          data={value?.map((item: string, idx: number) => ({ id: idx, value: item }))}
        />
      )
    case "zset":
      if (!Array.isArray(value)) {
        return null
      }
      return (
        <KeyDetailZset
          databaseId={databaseId}
          databaseIdx={databaseIdx}
          selectedKey={selectedKey}
          reload={reload}
          data={value?.map((item: any, idx: number) => ({ id: idx, member: item?.Member, score: item?.Score }))}
        />
      )
    case "stream":
      if (!Array.isArray(value)) {
        return null
      }
      return (
        <KeyDetailStream
          databaseId={databaseId}
          databaseIdx={databaseIdx}
          selectedKey={selectedKey}
          reload={reload}
          data={value?.map((item: any) => ({ id: item?.ID, value: JSON.stringify(item?.Values || {}) }))}
        />
      )
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

  const form = useForm<any>({
    defaultValues: {
      ttl: keyTtl,
    },
    resolver: zodResolver(
      z.object({
        ttl: z.number().min(-1),
      })
    ),
  })

  const submit = form.handleSubmit(async values => {
    try {
      await scorix.invoke("client:key-ttl-update", { connection_id: databaseId, database_index: databaseIdx, key_name: keyName, key_ttl: values.ttl })
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
          <DialogTitle>{t("update_ttl")}</DialogTitle>
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
