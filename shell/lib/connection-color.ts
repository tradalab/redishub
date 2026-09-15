import type { ConnectionReq, GroupItem } from "@/types"

export const CONNECTION_COLORS = {
  red: { swatch: "bg-red-500", tint: "text-red-600 dark:text-red-400" },
  orange: { swatch: "bg-orange-500", tint: "text-orange-600 dark:text-orange-400" },
  amber: { swatch: "bg-amber-400", tint: "text-amber-600 dark:text-amber-400" },
  green: { swatch: "bg-green-500", tint: "text-green-600 dark:text-green-400" },
  teal: { swatch: "bg-teal-500", tint: "text-teal-600 dark:text-teal-400" },
  blue: { swatch: "bg-blue-500", tint: "text-blue-600 dark:text-blue-400" },
  violet: { swatch: "bg-violet-500", tint: "text-violet-600 dark:text-violet-400" },
  pink: { swatch: "bg-pink-500", tint: "text-pink-600 dark:text-pink-400" },
} as const

export type ConnectionColor = keyof typeof CONNECTION_COLORS

export function isConnectionColor(value: string | undefined): value is ConnectionColor {
  return !!value && Object.prototype.hasOwnProperty.call(CONNECTION_COLORS, value)
}

export function resolveColor(
  connection: Pick<ConnectionReq, "color" | "group_id"> | undefined,
  groups: Pick<GroupItem, "id" | "color">[]
): ConnectionColor | undefined {
  if (!connection) return undefined
  if (isConnectionColor(connection.color)) return connection.color
  const groupColor = groups.find(g => g.id === connection.group_id)?.color
  return isConnectionColor(groupColor) ? groupColor : undefined
}
