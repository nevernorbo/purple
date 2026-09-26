import { Elysia } from "elysia"

import { FsModel } from "./model"
import { FsService } from "./service"

export const filesystemController = new Elysia({ prefix: "/fs" }).get(
  "/complete",
  ({ query }) => FsService.complete(query.path),
  { query: FsModel.complete }
)
