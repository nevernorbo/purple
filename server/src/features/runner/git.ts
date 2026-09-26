import { existsSync, lstatSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"

import { run, runOrThrow } from "../../lib/proc"
import { WORKTREES_DIR } from "./slug"

const SHARED_ENTRIES = ["node_modules", ".env"] as const
const EXCLUDES = [`${WORKTREES_DIR}/`, "/node_modules", "/.env"]

export abstract class Git {
  /** Resolves any path inside a repository to its top-level directory. */
  static async resolveRoot(path: string) {
    if (!existsSync(path)) throw new Error(`Path does not exist: ${path}`)
    const result = await run(["git", "rev-parse", "--show-toplevel"], path)
    if (result.code !== 0) throw new Error(`Not a git repository: ${path}`)
    return { root: result.stdout, name: basename(result.stdout) }
  }

  /**
   * Keeps worktrees and the symlinked node_modules/.env out of `git add -A`.
   * A symlink named node_modules does not match a `node_modules/` gitignore pattern.
   */
  static async ensureExcludes(root: string) {
    const commonDir = resolve(root, await runOrThrow(["git", "rev-parse", "--git-common-dir"], root))
    const excludePath = join(commonDir, "info", "exclude")
    mkdirSync(dirname(excludePath), { recursive: true })
    const current = existsSync(excludePath) ? readFileSync(excludePath, "utf8") : ""
    const lines = new Set(current.split("\n").map((l) => l.trim()))
    const missing = EXCLUDES.filter((e) => !lines.has(e))
    if (missing.length === 0) return
    const prefix = current && !current.endsWith("\n") ? "\n" : ""
    writeFileSync(excludePath, `${current}${prefix}# purple\n${missing.join("\n")}\n`)
  }

  static async addWorktree(root: string, branch: string, path: string) {
    mkdirSync(dirname(path), { recursive: true })
    await runOrThrow(["git", "worktree", "add", "-B", branch, path, "HEAD"], root)
  }

  static linkShared(root: string, worktree: string) {
    for (const entry of SHARED_ENTRIES) {
      const source = join(root, entry)
      const target = join(worktree, entry)
      if (!existsSync(source) || lexists(target)) continue
      symlinkSync(source, target)
    }
  }

  static async removeWorktree(root: string, path: string) {
    const result = await run(["git", "worktree", "remove", "--force", path], root)
    if (result.code !== 0 && existsSync(path)) {
      rmSync(path, { recursive: true, force: true })
    }
    await Git.prune(root)
  }

  static async prune(root: string) {
    await run(["git", "worktree", "prune"], root)
  }
}

function lexists(path: string) {
  try {
    lstatSync(path)
    return true
  } catch {
    return false
  }
}
