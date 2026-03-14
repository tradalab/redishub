import { create } from "zustand"
import { toast } from "sonner"
import scorix from "@/lib/scorix"
import { GroupDO } from "@/types/group.do"
import { ConnectionDO } from "@/types/connection.do"

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
      const [groups, databases] = await Promise.all([
        scorix.invoke<GroupDO[]>("mod:gorm:Query", { sql: 'SELECT * FROM "group" WHERE deleted_at IS NULL' }),
        scorix.invoke<ConnectionDO[]>("mod:gorm:Query", { sql: 'SELECT * FROM "connection" WHERE deleted_at IS NULL' }),
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
