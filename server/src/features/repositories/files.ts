import { runOrThrow } from "../../lib/proc"

const CACHE_TTL_MS = 5_000
const MAX_RESULTS = 50

export interface RepoFile {
  /** Repo-relative path; directories end in `/`. */
  path: string
  isDir: boolean
}

interface Listing {
  at: number
  entries: Promise<RepoFile[]>
}

const cache = new Map<string, Listing>()

/** Tracked and untracked-but-not-ignored files, plus every directory containing them. */
async function listAll(root: string): Promise<RepoFile[]> {
  const out = await runOrThrow(
    ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    root
  )
  const files = new Set(out.split("\0").filter(Boolean))
  const dirs = new Set<string>()
  for (const file of files) {
    let slash = file.lastIndexOf("/")
    while (slash > 0) {
      const dir = file.slice(0, slash + 1)
      if (dirs.has(dir)) break
      dirs.add(dir)
      slash = file.lastIndexOf("/", slash - 1)
    }
  }
  return [
    ...[...dirs].map((path) => ({ path, isDir: true })),
    ...[...files].map((path) => ({ path, isDir: false })),
  ]
}

function listCached(root: string) {
  const hit = cache.get(root)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.entries
  const entries = listAll(root)
  cache.set(root, { at: Date.now(), entries })
  entries.catch(() => cache.delete(root))
  return entries
}

const isBoundary = (c: string | undefined) =>
  c === undefined || c === "/" || c === "." || c === "-" || c === "_" || c === " "

/**
 * Subsequence fuzzy score, higher is better; null when `query` doesn't match.
 * Rewards consecutive runs, matches at word boundaries and hits in the basename.
 */
export function fuzzyScore(path: string, query: string): number | null {
  const target = path.endsWith("/") ? path.slice(0, -1) : path
  const lower = target.toLowerCase()
  const baseStart = target.lastIndexOf("/") + 1

  // A contiguous hit in the basename beats any scattered match.
  const baseIndex = lower.indexOf(query, baseStart)
  if (baseIndex !== -1) {
    return 1000 - (target.length - baseStart - query.length) - (baseIndex === baseStart ? 0 : 50)
  }

  let score = 0
  let from = 0
  let prev = -2
  for (const char of query) {
    const index = lower.indexOf(char, from)
    if (index === -1) return null
    score += 1
    if (index === prev + 1) score += 5
    if (isBoundary(target[index - 1])) score += 8
    if (index >= baseStart) score += 2
    prev = index
    from = index + 1
  }
  return score - target.length * 0.1
}

export async function searchRepoFiles(root: string, rawQuery: string): Promise<RepoFile[]> {
  const entries = await listCached(root)
  const query = rawQuery.trim().toLowerCase().replace(/^\.\//, "")

  // Nothing typed yet, or an exact folder: list that level, folders first.
  const folder = query === "" ? "" : entries.find((e) => e.isDir && e.path.toLowerCase() === query)?.path
  if (folder !== undefined) {
    return entries
      .filter((e) => {
        if (!e.path.startsWith(folder) || e.path === folder) return false
        const slash = e.path.indexOf("/", folder.length)
        return slash === -1 || slash === e.path.length - 1
      })
      .sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.path.localeCompare(b.path))
      .slice(0, MAX_RESULTS)
  }

  const scored: { entry: RepoFile; score: number }[] = []
  for (const entry of entries) {
    const score = fuzzyScore(entry.path, query)
    if (score !== null) scored.push({ entry, score })
  }
  return scored
    .sort((a, b) => b.score - a.score || a.entry.path.localeCompare(b.entry.path))
    .slice(0, MAX_RESULTS)
    .map((s) => s.entry)
}
