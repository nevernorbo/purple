import { t } from "elysia"
import { createInsertSchema } from "drizzle-typebox"

import { cards, columns, labels, repositories } from "./schema"

/**
 * drizzle-typebox insert schemas, refined where the API is stricter than the table.
 * Assigned to variables before being picked from, to avoid "Type instantiation is possibly infinite".
 */
export const insertRepository = createInsertSchema(repositories, {
  path: t.String({ minLength: 1 }),
})
export const insertColumn = createInsertSchema(columns, {
  name: t.String({ minLength: 1, maxLength: 80 }),
})
export const insertCard = createInsertSchema(cards, {
  title: t.String({ minLength: 1, maxLength: 200 }),
  prompt: t.String({ maxLength: 100_000 }),
})
export const insertLabel = createInsertSchema(labels, {
  name: t.String({ minLength: 1, maxLength: 40 }),
})

export const idParams = t.Object({ id: t.Numeric() })
