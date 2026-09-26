import { t } from "elysia"

import { insertColumn } from "../../db/model"

export const ColumnModel = {
  create: t.Object({ name: insertColumn.properties.name }),
  rename: t.Object({ name: insertColumn.properties.name }),
  move: t.Object({ direction: t.UnionEnum(["left", "right"]) }),
  remove: t.Object({ moveCardsTo: t.Optional(t.Integer()) }),
}
