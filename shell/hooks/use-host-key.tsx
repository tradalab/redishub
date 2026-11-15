"use client"

import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useQueryClient } from "@tanstack/react-query"
import { useHostKeyTrust, type HostKeyLabels } from "@tradalab/lyra/blocks"
import { ssh } from "@/api"

function useHostKeyLabels(): HostKeyLabels {
  const { t } = useTranslation()
  return useMemo(
    () => ({
      trustTitle: t("host_key_trust_title"),
      changedTitle: t("host_key_changed_title"),
      trustDescription: fingerprint => <span className="whitespace-pre-line">{t("host_key_trust_desc", { fingerprint })}</span>,
      changedDescription: fingerprint => <span className="whitespace-pre-line">{t("host_key_changed_desc", { fingerprint })}</span>,
      trust: t("host_key_trust"),
      cancel: t("cancel"),
    }),
    [t]
  )
}

export function useConfirmHostKey() {
  return useHostKeyTrust(useHostKeyLabels()).confirmHostKey
}

export function useRetryAfterTrust() {
  const { runWithTrust } = useHostKeyTrust(useHostKeyLabels())
  const queryClient = useQueryClient()
  return useCallback(
    <T,>(sshId: string | undefined, run: () => Promise<T>) =>
      runWithTrust(
        run,
        ask =>
          sshId
            ? async () => {
                await ssh.trust({ id: sshId, host_key: ask.key })
                await queryClient.invalidateQueries({ queryKey: ["ssh-list"] })
              }
            : undefined,
        sshId
      ),
    [runWithTrust, queryClient]
  )
}
