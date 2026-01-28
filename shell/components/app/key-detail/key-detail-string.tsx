"use client"

import { useState } from "react"
import { SaveIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CodeEditor } from "@/components/x/code-editor"
import { KeyKindEnum } from "@/types/key-kind.enum"
import { Spinner } from "@/components/ui/kibo-ui/spinner"
import { toast } from "sonner"
import scorix from "@/lib/scorix"
import { useTranslation } from "react-i18next"

export type KeyDetailStringProps = {
  databaseId: string
  databaseIdx: number
  selectedKey: string
  data: string
  reload: () => void
}

export function KeyDetailString(props: KeyDetailStringProps) {
  const { t } = useTranslation()
  const [changed, setChanged] = useState<boolean>(false)
  const [newVal, setNewVal] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)

  const update = async () => {
    setLoading(true)
    await scorix
      .invoke("client:key-value-update", {
        connection_id: props.databaseId,
        database_index: props.databaseIdx,
        key_name: props.selectedKey,
        key_kind: KeyKindEnum.STRING,
        key_value_string: newVal,
      })
      .then(() => {
        props.reload()
        toast.success(t("updated"))
      })
      .catch(e => {
        const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
        toast.error(msg)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <>
      <div>
        <Button size="sm" variant="outline" className="mb-2" disabled={!changed || loading} onClick={() => update()}>
          {loading ? <Spinner /> : <SaveIcon />}
          {t("save")}
        </Button>
      </div>
      <CodeEditor
        value={props.data}
        language="txt"
        autoFormat={true}
        defaultHeight={400}
        options={{ readOnly: loading, minimap: { enabled: false } }}
        onChange={val => {
          if (!changed) {
            setChanged(true)
          }
          if (val) {
            setNewVal(val)
          }
        }}
      />
    </>
  )
}
