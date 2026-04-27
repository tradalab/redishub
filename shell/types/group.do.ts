import { ConnectionDO } from "@/types/connection.do"

export type GroupDO = {
  id: string
  created_at: string
  updated_at: string
  deleted_at: string
  name: string
  connections: ConnectionDO[]
}
