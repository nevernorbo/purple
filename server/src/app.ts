import { staticPlugin } from "@elysiajs/static"
import { Elysia } from "elysia"
import { existsSync } from "node:fs"

import { config } from "./config"
import { auth } from "./lib/auth"
import { cardsController } from "./features/cards"
import { columnsController } from "./features/columns"
import { filesystemController } from "./features/filesystem"
import { labelsController } from "./features/labels"
import { realtimeController } from "./features/realtime"
import { repositoriesController } from "./features/repositories"

export const api = new Elysia({ prefix: "/api" })
  .use(auth)
  .use(repositoriesController)
  .use(columnsController)
  .use(cardsController)
  .use(labelsController)
  .use(filesystemController)

export const app = new Elysia().use(api).use(realtimeController)

if (config.production && existsSync(config.clientDist)) {
  app.use(await staticPlugin({ assets: config.clientDist, prefix: "/", indexHTML: true }))
}

export type App = typeof app
