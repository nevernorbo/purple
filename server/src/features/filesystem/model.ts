import { t } from "elysia"

export const FsModel = {
  complete: t.Object({ path: t.String({ default: "", maxLength: 4096 }) }),
}
