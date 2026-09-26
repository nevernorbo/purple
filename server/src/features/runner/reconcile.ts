import { eq } from "drizzle-orm"
import { existsSync } from "node:fs"

import { db } from "../../db/client"
import { cards, repositories } from "../../db/schema"
import { CardService } from "../cards/service"
import { ColumnService } from "../columns/service"
import { Git } from "./git"
import { worktreeFromBranch } from "./slug"

/** Fails cards orphaned by a previous crash/restart and cleans up their worktrees. */
export async function reconcile() {
  const repos = db.select().from(repositories).all()
  const repoById = new Map(repos.map((r) => [r.id, r]))
  const orphaned = db.select().from(cards).where(eq(cards.status, "running")).all()

  for (const card of orphaned) {
    const repo = repoById.get(card.repoId)
    if (repo && card.branch) {
      const worktree = worktreeFromBranch(repo.path, card.branch)
      if (existsSync(worktree)) await Git.removeWorktree(repo.path, worktree).catch(() => {})
    }
    db.transaction((tx) => {
      const column = ColumnService.system(card.repoId, "failed", tx)
      tx.update(cards)
        .set({
          status: "failed",
          columnId: column.id,
          position: CardService.nextPosition(column.id, tx),
          finishedAt: Date.now(),
          updatedAt: Date.now(),
        })
        .where(eq(cards.id, card.id))
        .run()
    })
  }

  for (const repo of repos) {
    if (existsSync(repo.path)) await Git.prune(repo.path)
  }

  return { failed: orphaned.length }
}
