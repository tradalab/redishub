"use client"

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { ConfigListDialogLabels, ProxyFieldsLabels, SshFieldsLabels, TlsFieldsLabels } from "@tradalab/lyra/blocks"

export function useConfigLabels() {
  const { t } = useTranslation()
  return useMemo(() => {
    const common = {
      host: t("host"),
      port: t("port"),
      username: t("username"),
      password: t("password"),
      optional: t("optional"),
      required: t("required"),
      portRange: t("port_range"),
    }
    const dialog: ConfigListDialogLabels = { add: t("add"), delete: t("delete"), test: t("test_conn"), save: t("save") }
    const proxy: ProxyFieldsLabels = { ...common, protocol: t("protocol") }
    const ssh: SshFieldsLabels = {
      ...common,
      timeout: t("timeout_s"),
      kind: t("auth_type"),
      kindPassword: t("password"),
      kindKeypair: t("ssh_kind_keypair"),
      kindAgent: t("ssh_kind_agent"),
      privateKey: t("private_key"),
      privateKeyPlaceholder: t("enter_private_key_pem"),
      passphrase: t("passphrase"),
      hostKey: t("host_key"),
      hostKeyUntrusted: t("host_key_untrusted"),
      hostKeyHint: t("host_key_help"),
    }
    const tls: TlsFieldsLabels = {
      name: t("name"),
      optional: t("optional"),
      verify: t("verify_tls"),
      verifyHint: t("verify_tls_desc"),
      useSni: t("use_sni"),
      useSniHint: t("use_sni_desc"),
      serverName: t("server_ca_name"),
      caCert: t("root_ca_cert"),
      clientAuth: t("client_auth"),
      clientAuthHint: t("client_auth_desc"),
      clientCert: t("client_cert"),
      clientKey: t("client_key"),
    }
    return { dialog, proxy, ssh, tls }
  }, [t])
}
