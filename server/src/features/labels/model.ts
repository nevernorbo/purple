import { t } from "elysia"

import { insertLabel } from "../../db/model"

export const LabelModel = {
  create: t.Object({
    name: insertLabel.properties.name,
    color: insertLabel.properties.color,
  }),
  update: t.Object({
    name: t.Optional(insertLabel.properties.name),
    color: t.Optional(insertLabel.properties.color),
  }),
}
