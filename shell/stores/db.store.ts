import { create } from "zustand"
import { toast } from "sonner"
import scorix from "@/lib/scorix"
import { GroupDO } from "@/types/group.do"
import { ConnectionDo } from "@/types/connection.do"

interface DbState {
  loading: boolean
  groups: GroupDO[]
  databases: ConnectionDo[]
  load: () => Promise<void>
}

export const useDbStore = create<DbState>(set => ({
  loading: false,
  groups: [],
  databases: [],

  load: async () => {
    set({ loading: true })
    try {
      const [groups, databases] = await Promise.all([
        scorix.invoke<GroupDO[]>("ext:gorm:Query", 'SELECT * FROM "group" WHERE deleted_at IS NULL'),
        scorix.invoke<ConnectionDo[]>("ext:gorm:Query", 'SELECT * FROM "connection" WHERE deleted_at IS NULL'),
      ])

      set({ groups, databases })
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"
      toast.error(msg)
    } finally {
      set({ loading: false })
    }
  },
}))
