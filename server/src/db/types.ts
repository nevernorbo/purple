import type { cardRevisions, cards, columns, labels, repositories } from "./schema"

export type Repo = typeof repositories.$inferSelect
export type Column = typeof columns.$inferSelect
export type CardRow = typeof cards.$inferSelect
export type Card = CardRow & { labelIds: number[] }
export type Label = typeof labels.$inferSelect
export type CardRevision = typeof cardRevisions.$inferSelect
