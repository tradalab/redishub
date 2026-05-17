"use client"

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import scorix from "@/lib/scorix"
import { client } from "@/api"
import type {
  ClientGeneralRes,
  ClientGetSlowQueryRes,
  ClientKeysMetadataRes,
  ClientLoadAllKeysRes,
  ClientLoadKeyDetailRes,
  ClientLoadKeyValuePageRes,
} from "@/types"

const KEYS_BASE = "redis-keys"
const KEY_VALUE_PAGE_BASE = "redis-key-value-page"
const GENERAL_BASE = "client-general"
const KEY_DETAIL_BASE = "client-key-detail"
const SLOW_QUERY_BASE = "client-slow-query"

export function useConnect() {
  return useMutation({ mutationFn: client.connect })
}

export function useDisconnect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: client.disconnect,
    onSuccess: (_, vars) => {
      qc.removeQueries({ queryKey: [GENERAL_BASE, vars.connection_id] })
      qc.removeQueries({ queryKey: [KEYS_BASE, vars.connection_id] })
      qc.removeQueries({ queryKey: [KEY_DETAIL_BASE, vars.connection_id] })
      qc.removeQueries({ queryKey: [SLOW_QUERY_BASE, vars.connection_id] })
    },
  })
}

export function useConnectionGeneral(
  connectionId: string | undefined,
  databaseIdx: number,
  options?: { refetchInterval?: number | false; enabled?: boolean }
) {
  return useQuery<ClientGeneralRes>({
    queryKey: [GENERAL_BASE, connectionId, databaseIdx],
    queryFn: () => client.general({ connection_id: connectionId!, database_index: databaseIdx }),
    enabled: !!connectionId && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval,
    refetchIntervalInBackground: true,
  })
}

export function useClearConnectionCache() {
  const qc = useQueryClient()
  return (connectionId: string) => {
    qc.removeQueries({ queryKey: [GENERAL_BASE, connectionId] })
    qc.removeQueries({ queryKey: [KEYS_BASE, connectionId] })
    qc.removeQueries({ queryKey: [KEY_DETAIL_BASE, connectionId] })
    qc.removeQueries({ queryKey: [SLOW_QUERY_BASE, connectionId] })
  }
}

export function useSlowQuery(connectionId: string | undefined, databaseIdx: number) {
  return useQuery<ClientGetSlowQueryRes>({
    queryKey: [SLOW_QUERY_BASE, connectionId, databaseIdx],
    queryFn: () => client.getslowquery({ connection_id: connectionId!, database_index: databaseIdx }),
    enabled: !!connectionId,
  })
}

export function useKeyDetail(connectionId: string | undefined, databaseIdx: number, key: string | undefined) {
  return useQuery<ClientLoadKeyDetailRes>({
    queryKey: [KEY_DETAIL_BASE, connectionId, databaseIdx, key],
    queryFn: () => client.loadkeydetail({ connection_id: connectionId!, database_index: databaseIdx, key: key! }),
    enabled: !!connectionId && !!key,
  })
}

export function useKeysList(connectionId: string, databaseIdx: number, opts?: { count?: number }) {
  const count = opts?.count ?? 10000
  return useInfiniteQuery<ClientLoadAllKeysRes>({
    queryKey: [KEYS_BASE, connectionId, databaseIdx],
    enabled: !!connectionId,
    initialPageParam: "0",
    queryFn: ({ pageParam }) =>
      client.loadallkeys({
        connection_id: connectionId,
        database_index: databaseIdx,
        prefix: "",
        cursor: pageParam as string,
        count,
      }),
    getNextPageParam: last => (last.cursor && last.cursor !== "0" ? last.cursor : undefined),
  })
}

export function useKeysMetadata() {
  return useMutation<ClientKeysMetadataRes, Error, { connection_id: string; database_index: number; keys: string[] }>({
    mutationFn: client.keysmetadata,
  })
}

function invalidateKeyList(qc: ReturnType<typeof useQueryClient>, connectionId: string, databaseIdx: number) {
  qc.invalidateQueries({ queryKey: [KEYS_BASE, connectionId, databaseIdx] })
}

export function useKeyCreate(connectionId: string, databaseIdx: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: client.keycreate,
    onSuccess: (_, vars) => {
      invalidateKeyList(qc, connectionId, databaseIdx)
      qc.invalidateQueries({ queryKey: [KEY_DETAIL_BASE, connectionId, databaseIdx, vars.key] })
      qc.invalidateQueries({ queryKey: [KEY_VALUE_PAGE_BASE, connectionId, databaseIdx, vars.key] })
    },
  })
}

export function useKeyDelete(connectionId: string, databaseIdx: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: client.keydelete,
    onSuccess: (_, vars) => {
      invalidateKeyList(qc, connectionId, databaseIdx)
      qc.removeQueries({ queryKey: [KEY_DETAIL_BASE, connectionId, databaseIdx, vars.key] })
      qc.removeQueries({ queryKey: [KEY_VALUE_PAGE_BASE, connectionId, databaseIdx, vars.key] })
    },
  })
}

export function useKeyNameUpdate(connectionId: string, databaseIdx: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: client.keynameupdate,
    onSuccess: () => invalidateKeyList(qc, connectionId, databaseIdx),
  })
}

export function useKeyTtlUpdate(connectionId: string, databaseIdx: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: client.keyttlupdate,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY_DETAIL_BASE, connectionId, databaseIdx, vars.key_name] })
    },
  })
}

export function useKeyValueUpdate() {
  return useMutation({ mutationFn: client.keyvalueupdate })
}

export function useKeysDeleteByPrefix(connectionId: string, databaseIdx: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: { prefix: string; keys?: string[]; onProgress?: (data: any) => void }) => {
      const { prefix, keys, onProgress } = params
      let cleanup = () => {}
      if (onProgress && (!keys || keys.length === 0)) {
        cleanup = scorix.on(`client:keys-delete-progress:${connectionId}`, (data: any) => {
          if (data.prefix === prefix) onProgress(data)
        })
      }
      try {
        return await client.keysdeletebyprefix({
          connection_id: connectionId,
          database_index: databaseIdx,
          prefix,
          keys: keys ?? [],
        })
      } finally {
        cleanup()
      }
    },
    onSuccess: () => invalidateKeyList(qc, connectionId, databaseIdx),
  })
}

export function useKeyValuePageQuery(
  connectionId: string,
  databaseIdx: number,
  key: string,
  kind: string,
  pageSize: number = 200
) {
  return useInfiniteQuery<ClientLoadKeyValuePageRes>({
    queryKey: [KEY_VALUE_PAGE_BASE, connectionId, databaseIdx, key, kind],
    enabled: !!connectionId && !!key,
    initialPageParam: "0",
    queryFn: ({ pageParam }) =>
      client.loadkeyvaluepage({
        connection_id: connectionId,
        database_index: databaseIdx,
        key,
        kind,
        cursor: pageParam as string,
        page_size: pageSize,
      }),
    getNextPageParam: last => (last.has_more ? last.next_cursor : undefined),
  })
}

export function useConsoleConnect() {
  return useMutation({ mutationFn: client.consoleconnect })
}
