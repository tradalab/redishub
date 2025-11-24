import {DatabaseDO} from "@/types/database.do"

export type GroupDO = {
  id: string
  created_at: string
  updated_at: string
  deleted_at: string
  name: string
  databases: DatabaseDO[]
}