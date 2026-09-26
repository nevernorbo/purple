import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

const dataDir = resolve(process.env.PURPLE_DATA_DIR ?? join(import.meta.dir, "../../data"))
mkdirSync(join(dataDir, "logs"), { recursive: true })

/** Without PURPLE_TOKEN, a random token is generated once and persisted in the data dir. */
function loadToken() {
  if (process.env.PURPLE_TOKEN) return { token: process.env.PURPLE_TOKEN, tokenFile: null }
  const tokenFile = join(dataDir, "token")
  if (!existsSync(tokenFile)) {
    writeFileSync(tokenFile, crypto.randomUUID().replaceAll("-", ""), { mode: 0o600 })
  }
  return { token: readFileSync(tokenFile, "utf8").trim(), tokenFile }
}

const { token, tokenFile } = loadToken()

export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? "0.0.0.0",
  token,
  tokenFile,
  dataDir,
  dbPath: process.env.PURPLE_DB ?? join(dataDir, "purple.sqlite"),
  logsDir: join(dataDir, "logs"),
  claudeBin: process.env.PURPLE_CLAUDE_BIN ?? "claude",
  ghBin: process.env.PURPLE_GH_BIN ?? "gh",
  clientDist: resolve(import.meta.dir, "../../client/dist"),
  production: process.env.NODE_ENV === "production",
} as const
