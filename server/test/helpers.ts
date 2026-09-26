import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { app } from "../src/app"
import type { Card } from "../src/db/types"
import { bus } from "../src/features/realtime/bus"
import { runOrThrow } from "../src/lib/proc"

export async function request(method: string, path: string, body?: unknown) {
  const res = await app.handle(
    new Request(`http://localhost/api${path}`, {
      method,
      headers: {
        authorization: "Bearer test-token",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  )
  const text = await res.text()
  let data: any = text
  try {
    data = JSON.parse(text)
  } catch {}
  return { status: res.status, data }
}

/** A git repo with a bare origin, a node_modules dir and a .env file. */
export async function createGitRepo() {
  const base = mkdtempSync(join(tmpdir(), "purple-repo-"))
  const origin = join(base, "origin.git")
  const repo = join(base, "repo")
  await runOrThrow(["git", "init", "-q", "--bare", origin], base)
  await runOrThrow(["git", "init", "-q", "-b", "main", repo], base)
  const git = (...args: string[]) => runOrThrow(["git", ...args], repo)
  await git("config", "user.email", "test@example.com")
  await git("config", "user.name", "Test")
  writeFileSync(join(repo, "README.md"), "# test\n")
  writeFileSync(join(repo, ".gitignore"), "node_modules/\n.env\n")
  await git("add", "-A")
  await git("commit", "-qm", "init")
  await git("remote", "add", "origin", origin)
  mkdirSync(join(repo, "node_modules"))
  writeFileSync(join(repo, ".env"), "SECRET=1\n")
  return { repo, git }
}

/** Resolves with the card once a card.upserted event matches the predicate. */
export function waitForCard(id: number, predicate: (card: Card) => boolean, timeout = 10_000) {
  return new Promise<Card>((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe()
      reject(new Error(`timed out waiting for card ${id}`))
    }, timeout)
    const unsubscribe = bus.subscribe((event) => {
      if (event.type === "card.upserted" && event.card.id === id && predicate(event.card)) {
        clearTimeout(timer)
        unsubscribe()
        resolve(event.card)
      }
    })
  })
}

export async function setupBoard() {
  const { repo, git } = await createGitRepo()
  const { data: created } = await request("POST", "/repos", { path: repo })
  const { data: snapshotColumns } = await request("POST", `/repos/${created.id}/columns`, {
    name: "Ready",
  })
  return { repo, git, repoId: created.id as number, ready: snapshotColumns as { id: number } }
}
