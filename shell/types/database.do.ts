import {GroupDO} from "@/types/group.do"

export type DatabaseDO = {
  id: string
  created_at: string
  updated_at: string
  deleted_at: string
  group_id: string
  group: GroupDO
  name: string
  network: string
  host: string
  port: number
  sock: string
  username: string
  password: string
  last_db: number
}