import { FileType } from "@/components/x/file-upload"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Trash2Icon } from "lucide-react"
import { formatFileSize } from "@/lib/utils"

export type MediaItemProps = {
  field: FileType
  onDelete: () => void
}

export const MediaItem = ({ field, onDelete }: MediaItemProps) => {
  if (!field.file) {
    return null
  }

  return (
    <li className="bg-ui-bg-component shadow-elevation-card-rest flex items-center justify-between rounded-lg px-3 py-2">
      <div className="flex items-center gap-x-2">
        <div className="flex items-center gap-x-3">
          <div className="bg-ui-bg-base h-10 w-[30px] overflow-hidden rounded-md">
            <ThumbnailPreview url={field.url} />
          </div>
          <div className="flex flex-col max-w-[410px]">
            <Label className="truncate whitespace-nowrap overflow-hidden text-sm">{field?.file?.name ? field?.file?.name : ""}</Label>
            <div className="flex items-center gap-x-1">
              <Label className="text-ui-fg-subtle whitespace-nowrap overflow-hidden text-sm">
                {field?.file?.size ? formatFileSize(field?.file?.size) : ""}
              </Label>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-x-1">
        <Button onClick={onDelete}>
          <Trash2Icon className="w-4 h-4" />
        </Button>
      </div>
    </li>
  )
}

const ThumbnailPreview = ({ url }: { url?: string | null }) => {
  if (!url) {
    return null
  }

  return <img src={url} alt="" className="size-full object-cover object-center" />
}
