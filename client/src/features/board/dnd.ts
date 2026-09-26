import type { Card, Column } from "purple-server"

/** Sortable ids are namespaced so card and column ids never collide. */
export const columnDndId = (id: number) => `column-${id}`
export const cardDndId = (id: number) => `card-${id}`

export type DragData =
  | { type: "column"; column: Column }
  /** `columnId` is the column the card is rendered in, which differs from `card.columnId` mid-drag. */
  | { type: "card"; card: Card; columnId: number }
