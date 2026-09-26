import { t } from "elysia"

import { insertRepository } from "../../db/model"

export const RepoModel = {
  create: t.Object({ path: insertRepository.properties.path }),
}
