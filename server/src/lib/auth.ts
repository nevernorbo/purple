import { createHash, timingSafeEqual } from "node:crypto"
import { Elysia } from "elysia"

import { config } from "../config"

const digest = (value: string) => createHash("sha256").update(value).digest()
const expected = digest(config.token)

export function isValidToken(candidate: string | null | undefined) {
  if (!candidate) return false
  return timingSafeEqual(digest(candidate), expected)
}

export const auth = new Elysia({ name: "auth" }).onBeforeHandle(
  { as: "scoped" },
  ({ headers, status }) => {
    const header = headers.authorization ?? ""
    const token = header.startsWith("Bearer ") ? header.slice(7) : null
    if (!isValidToken(token)) return status(401, "Unauthorized")
  }
)
