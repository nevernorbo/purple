import { Elysia } from "elysia"

import { idParams } from "../../db/model"
import { PrSummary } from "../runner/pr"
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
  .get("/cards/:id/revisions", ({ params }) => CardService.revisions(params.id), { params: idParams })
  .post(
    "/cards/:id/revisions/:revisionId/restore",
    ({ params }) => CardService.restore(params.id, params.revisionId),
    { params: CardModel.revisionParams }
  )
  .post(
    "/cards/:id/pr-summary",
    async ({ params }) => {
      CardService.get(params.id)
      return (await PrSummary.refresh(params.id)) ?? CardService.get(params.id)
    },
    { params: idParams }
  )
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
