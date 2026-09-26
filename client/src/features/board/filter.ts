import type { Card, Label } from "purple-server"

/** Label ids whose names contain the search text, so typing a label name finds its cards. */
export function labelsMatching(labels: Label[], q: string) {
  const needle = q.trim().toLowerCase()
  if (!needle) return []
  return labels
    .filter((l) => l.name.toLowerCase().includes(needle))
    .map((l) => l.id)
}

export function matchesFilter(
  card: Card,
  q: string,
  labelIds: number[],
  searchLabelIds: number[] = []
) {
  if (labelIds.length > 0 && !labelIds.some((id) => card.labelIds.includes(id)))
    return false
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  return (
    card.title.toLowerCase().includes(needle) ||
    card.prompt.toLowerCase().includes(needle) ||
    (card.branch?.toLowerCase().includes(needle) ?? false) ||
    searchLabelIds.some((id) => card.labelIds.includes(id))
  )
}
