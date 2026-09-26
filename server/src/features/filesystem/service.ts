import { existsSync, readdirSync, statSync, type Dirent } from "node:fs"
import { homedir } from "node:os"
import { basename, dirname, isAbsolute, join } from "node:path"

const MAX_ENTRIES = 100

export interface PathEntry {
  /** The completed path as the user would type it (keeps a leading `~`), ending in `/`. */
  path: string
  name: string
  isGitRepo: boolean
}

export function expandHome(path: string) {
  if (path === "~") return homedir()
  if (path.startsWith("~/")) return join(homedir(), path.slice(2))
  return path
}

function isDirectory(parent: string, entry: Dirent) {
  if (entry.isDirectory()) return true
  if (!entry.isSymbolicLink()) return false
  try {
    return statSync(join(parent, entry.name)).isDirectory()
  } catch {
    return false
  }
}

export abstract class FsService {
  /**
   * Lists subdirectories completing `input`: `/a/b/` lists b's children, `/a/b` lists
   * a's children starting with "b". Hidden directories only show once a `.` is typed.
   */
  static complete(input: string): PathEntry[] {
    const raw = input.trim() === "" || input.trim() === "~" ? "~/" : input.trim()
    const expanded = expandHome(raw)
    if (!isAbsolute(expanded)) return []

    const listsChildren = raw.endsWith("/")
    const dir = listsChildren ? expanded : dirname(expanded)
    const prefix = (listsChildren ? "" : basename(expanded)).toLowerCase()
    const typedDir = raw.slice(0, raw.lastIndexOf("/") + 1)

    let entries: Dirent[]
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return []
    }

    return entries
      .filter((e) => e.name.toLowerCase().startsWith(prefix))
      .filter((e) => prefix.startsWith(".") || !e.name.startsWith("."))
      .filter((e) => isDirectory(dir, e))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
      .slice(0, MAX_ENTRIES)
      .map((e) => ({
        path: `${typedDir}${e.name}/`,
        name: e.name,
        isGitRepo: existsSync(join(dir, e.name, ".git")),
      }))
  }
}
