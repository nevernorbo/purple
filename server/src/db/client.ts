import { Database } from "bun:sqlite"
import { join } from "node:path"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"

import { config } from "../config"
import * as schema from "./schema"

export function createDb(path: string) {
  const client = new Database(path, { create: true, strict: true })
  client.run("PRAGMA journal_mode = WAL")
  client.run("PRAGMA foreign_keys = ON")
  client.run("PRAGMA busy_timeout = 5000")

  const db = drizzle({ client, schema, casing: "snake_case" })
  migrate(db, { migrationsFolder: join(import.meta.dir, "../../drizzle") })
  return db
}

export type Db = ReturnType<typeof createDb>

export const db = createDb(config.dbPath)
