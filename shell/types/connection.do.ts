import { GroupDO } from "@/types/group.do"
import { RedisModeEnum } from "@/types/redis-mode.enum"
import { SshDO } from "@/types/ssh.do"
import { TlsDO } from "@/types/tls.do"

export type ConnectionDO = {
  id: string
  created_at: string
  updated_at: string
  deleted_at: string
  group_id: string
  group: GroupDO
  mode: RedisModeEnum
  name: string
  network: string
  host: string
  port: number
  addrs: string
  sentinel_master: string
  sentinel_username: string
  sentinel_password: string
  sock: string
  username: string
  password: string
  addr_mapping: string
  last_db: number
  exec_timeout: number
  dial_timeout: number
  key_size: number
  ssh_enable: boolean
  ssh_id: string
  ssh: SshDO
  proxy_enable: boolean
  proxy_id: string
  proxy: any
  tls_enable: boolean
  tls_id: string
  tls: TlsDO
}
