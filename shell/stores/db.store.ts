import { create } from "zustand"
import { toast } from "sonner"
import scorix from "@/lib/scorix"
import { GroupItem as GroupDO, GroupListRes, ConnectionReq as ConnectionDO, ConnectionListRes } from "@/types"

interface DbState {
  loading: boolean
  groups: GroupDO[]
  databases: ConnectionDO[]
  load: () => Promise<void>
}

export const useDbStore = create<DbState>(set => ({
  loading: false,
  groups: [],
  databases: [],

  load: async () => {
    set({ loading: true })
    try {
      const [groupRes, connRes] = await Promise.all([
        scorix.invoke<GroupListRes>("group:list", {}),
        scorix.invoke<ConnectionListRes>("connection:list", {}),
      ])

      set({ groups: groupRes.items || [], databases: connRes.items || [] })
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"
      toast.error(msg)
    } finally {
      set({ loading: false })
    }
  },
}))
