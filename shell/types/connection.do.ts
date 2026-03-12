import {GroupDO} from "@/types/group.do"
import {SshDO} from "@/types/ssh.do"

export type ConnectionDO = {
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
  ssh_enable: boolean
  ssh_id: string
  ssh: SshDO
}
