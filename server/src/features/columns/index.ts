import { Elysia, t } from "elysia"

import { idParams } from "../../db/model"
import { RepoService } from "../repositories/service"
import { ColumnModel } from "./model"
import { ColumnService } from "./service"

export const columnsController = new Elysia()
  .post(
    "/repos/:id/columns",
    ({ params, body }) => {
      RepoService.get(params.id)
      return ColumnService.create(params.id, body.name.trim())
    },
    { params: idParams, body: ColumnModel.create }
  )
  .patch("/columns/:id", ({ params, body }) => ColumnService.rename(params.id, body.name.trim()), {
    params: idParams,
    body: ColumnModel.rename,
  })
  .post("/columns/:id/move", ({ params, body }) => ColumnService.move(params.id, body.direction), {
    params: idParams,
    body: ColumnModel.move,
  })
  .delete(
    "/columns/:id",
    ({ params, body }) => {
      ColumnService.remove(params.id, body?.moveCardsTo)
      return { ok: true }
    },
    { params: idParams, body: t.Optional(ColumnModel.remove) }
  )
