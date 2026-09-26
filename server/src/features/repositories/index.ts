import { Elysia } from "elysia"

import { idParams } from "../../db/model"
import { searchRepoFiles } from "./files"
import { RepoModel } from "./model"
import { RepoService } from "./service"

export const repositoriesController = new Elysia({ prefix: "/repos" })
  .get("/", () => RepoService.list())
  .post("/", ({ body }) => RepoService.create(body.path), { body: RepoModel.create })
  .get("/:id/files", ({ params, query }) => searchRepoFiles(RepoService.get(params.id).path, query.q), {
    params: idParams,
    query: RepoModel.files,
  })
  .delete(
    "/:id",
    ({ params }) => {
      RepoService.remove(params.id)
      return { ok: true }
    },
    { params: idParams }
  )
