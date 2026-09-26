import { t } from "elysia"

import { insertCard } from "../../db/model"

const labelIds = t.Array(t.Integer(), { maxItems: 50 })

export const CardModel = {
  create: t.Object({
    title: insertCard.properties.title,
    prompt: t.Optional(insertCard.properties.prompt),
    labelIds: t.Optional(labelIds),
  }),
  update: t.Object({
    title: t.Optional(insertCard.properties.title),
    prompt: t.Optional(insertCard.properties.prompt),
    labelIds: t.Optional(labelIds),
  }),
  move: t.Object({ columnId: t.Integer(), index: t.Optional(t.Integer({ minimum: 0 })) }),
}
