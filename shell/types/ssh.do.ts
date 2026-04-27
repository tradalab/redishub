import { ConnectionDO } from "@/types/connection.do"
import { SshKindEnum } from "@/types/ssh-kind.enum"

export type SshDO = {
  id: string
  created_at: string
  updated_at: string
  deleted_at: string
  host: string
  port: number
  timeout: number
  username: string
  kind: SshKindEnum
  password: string
  private_key: string
  passphrase: string
  connections: ConnectionDO[]
}
