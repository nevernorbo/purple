import { Elysia } from "elysia"

import { idParams } from "../../db/model"
import { LabelModel } from "./model"
import { LabelService } from "./service"

export const labelsController = new Elysia({ prefix: "/labels" })
  .get("/", () => LabelService.list())
  .post("/", ({ body }) => LabelService.create(body), { body: LabelModel.create })
  .patch("/:id", ({ params, body }) => LabelService.update(params.id, body), {
    params: idParams,
    body: LabelModel.update,
  })
  .delete(
    "/:id",
    ({ params }) => {
      LabelService.remove(params.id)
      return { ok: true }
    },
    { params: idParams }
  )
