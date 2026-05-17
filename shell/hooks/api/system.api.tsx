"use client"

import { useQuery } from "@tanstack/react-query"
import { system } from "@/api"
import type { SystemInfoRes } from "@/types"

export function useSystemInfo() {
  return useQuery<SystemInfoRes>({
    queryKey: ["system-info"],
    queryFn: () => system.info({}),
    staleTime: Infinity,
  })
}
