import type { Card } from "purple-server"

export function matchesFilter(card: Card, q: string, labelIds: number[]) {
  if (labelIds.length > 0 && !labelIds.some((id) => card.labelIds.includes(id)))
    return false
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  return (
    card.title.toLowerCase().includes(needle) ||
    card.prompt.toLowerCase().includes(needle) ||
    (card.branch?.toLowerCase().includes(needle) ?? false)
  )
}
