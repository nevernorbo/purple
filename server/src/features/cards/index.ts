import { Elysia } from "elysia"

import { idParams } from "../../db/model"
import { Runner } from "../runner/service"
import { CardModel } from "./model"
import { CardService } from "./service"

export const cardsController = new Elysia()
  .get("/cards", () => CardService.list())
  .post("/columns/:id/cards", ({ params, body }) => CardService.create(params.id, body), {
    params: idParams,
    body: CardModel.create,
  })
  .patch("/cards/:id", ({ params, body }) => CardService.update(params.id, body), {
    params: idParams,
    body: CardModel.update,
  })
  .post("/cards/:id/move", ({ params, body }) => CardService.move(params.id, body.columnId, body.index), {
    params: idParams,
    body: CardModel.move,
  })
  .post("/cards/:id/start", ({ params }) => Runner.start(params.id), { params: idParams })
  .post(
    "/cards/:id/stop",
    ({ params }) => {
      Runner.stop(params.id)
      return { ok: true }
    },
    { params: idParams }
  )
  .delete(
    "/cards/:id",
    ({ params }) => {
      CardService.remove(params.id)
      return { ok: true }
    },
    { params: idParams }
  )
