export type TlsDO = {
  id: string
  created_at: string
  updated_at: string
  deleted_at: string
  name: string
  use_sni: boolean
  server_name: string
  verify: boolean
  client_auth: boolean
  ca_cert: string
  cert: string
  key: string
}
