import {ConnectionDO} from "@/types/connection.do"
import {SshKindEnum} from "@/types/ssh-kind.enum"

export type SshDO = {
  id: string
  created_at: string
  updated_at: string
  deleted_at: string
  host: string
  port: number
  username: string
  kind: SshKindEnum
  password: string
  private_key_file: string
  passphrase: string
  connections: ConnectionDO[]
}
