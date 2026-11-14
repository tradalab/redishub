"use client"

import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useQueryClient } from "@tanstack/react-query"
import { useConfirm } from "@tradalab/lyra/blocks"
import { ssh } from "@/api"
import { hostKeyAsk, type HostKeyAsk } from "@/lib/host-key"

export function useConfirmHostKey() {
  const { t } = useTranslation()
  const confirm = useConfirm()
  return useCallback(
    (ask: HostKeyAsk) =>
      confirm({
        title: t(ask.changed ? "host_key_changed_title" : "host_key_trust_title"),
        description: (
          <span className="whitespace-pre-line">{t(ask.changed ? "host_key_changed_desc" : "host_key_trust_desc", { fingerprint: ask.fingerprint })}</span>
        ),
        confirmText: t("host_key_trust"),
        cancelText: t("cancel"),
        danger: ask.changed,
      }),
    [confirm, t]
  )
}

export function useRetryAfterTrust() {
  const confirmHostKey = useConfirmHostKey()
  const queryClient = useQueryClient()
  return useCallback(
    async <T,>(sshId: string | undefined, run: () => Promise<T>): Promise<{ declined: true } | { declined: false; value: T }> => {
      try {
        return { declined: false, value: await run() }
      } catch (e) {
        const ask = hostKeyAsk(e)
        if (!ask || !sshId) throw e
        if (!(await confirmHostKey(ask))) return { declined: true }
        await ssh.trust({ id: sshId, host_key: ask.key })
        await queryClient.invalidateQueries({ queryKey: ["ssh-list"] })
        return { declined: false, value: await run() }
      }
    },
    [confirmHostKey, queryClient]
  )
}
