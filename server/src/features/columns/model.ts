import { t } from "elysia"

import { insertColumn } from "../../db/model"

export const ColumnModel = {
  create: t.Object({ name: insertColumn.properties.name }),
  rename: t.Object({ name: insertColumn.properties.name }),
  move: t.Object({ index: t.Integer({ minimum: 0 }) }),
  remove: t.Object({ moveCardsTo: t.Optional(t.Integer()) }),
}
