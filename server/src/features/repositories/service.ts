import { and, asc, eq } from "drizzle-orm"

import { db } from "../../db/client"
import { cards, columns, repositories } from "../../db/schema"
import type { Repo } from "../../db/types"
import { fail } from "../../lib/errors"
import { bus } from "../realtime/bus"
import { ColumnService } from "../columns/service"
import { Git } from "../runner/git"

export abstract class RepoService {
  static list(): Repo[] {
    return db.select().from(repositories).orderBy(asc(repositories.name)).all()
  }

  static get(id: number): Repo {
    const repo = db.select().from(repositories).where(eq(repositories.id, id)).get()
    if (!repo) throw fail.notFound("Repository")
    return repo
  }

  static async create(path: string): Promise<Repo> {
    let resolved: { root: string; name: string }
    try {
      resolved = await Git.resolveRoot(path.trim())
    } catch (error) {
      throw fail.badRequest((error as Error).message)
    }
    const existing = db
      .select()
      .from(repositories)
      .where(eq(repositories.path, resolved.root))
      .get()
    if (existing) throw fail.conflict(`Repository already registered: ${resolved.root}`)

    await Git.ensureExcludes(resolved.root)

    const { repo, boardColumns } = db.transaction((tx) => {
      const repo = tx
        .insert(repositories)
        .values({ name: resolved.name, path: resolved.root })
        .returning()
        .get()
      return { repo, boardColumns: ColumnService.createSystemColumns(repo.id, tx) }
    })

    bus.publish({ type: "repo.upserted", repo })
    bus.publish({ type: "columns.reordered", repoId: repo.id, columns: boardColumns })
    return repo
  }

  static remove(id: number) {
    RepoService.get(id)
    const running = db
      .select({ id: cards.id })
      .from(cards)
      .where(and(eq(cards.repoId, id), eq(cards.status, "running")))
      .get()
    if (running) throw fail.conflict("Repository has running cards")

    db.transaction((tx) => {
      // Cards restrict column deletion, so remove them before the cascade reaches columns.
      tx.delete(cards).where(eq(cards.repoId, id)).run()
      tx.delete(columns).where(eq(columns.repoId, id)).run()
      tx.delete(repositories).where(eq(repositories.id, id)).run()
    })
    bus.publish({ type: "repo.deleted", id })
  }
}
