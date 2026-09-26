import { and, asc, eq, max } from "drizzle-orm"

import { db } from "../../db/client"
import { cards, columns, type SystemColumnKind } from "../../db/schema"
import type { Column } from "../../db/types"
import { fail } from "../../lib/errors"
import { bus } from "../realtime/bus"
import { CardService } from "../cards/service"

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

export const SYSTEM_COLUMNS: { kind: SystemColumnKind; name: string }[] = [
  { kind: "running", name: "Running" },
  { kind: "completed", name: "Completed" },
  { kind: "failed", name: "Failed" },
]

export abstract class ColumnService {
  static list(): Column[] {
    return db.select().from(columns).orderBy(asc(columns.position)).all()
  }

  static listByRepo(repoId: number, tx: Tx | typeof db = db): Column[] {
    return tx
      .select()
      .from(columns)
      .where(eq(columns.repoId, repoId))
      .orderBy(asc(columns.position), asc(columns.id))
      .all()
  }

  static get(id: number): Column {
    const column = db.select().from(columns).where(eq(columns.id, id)).get()
    if (!column) throw fail.notFound("Column")
    return column
  }

  static system(repoId: number, kind: SystemColumnKind, tx: Tx | typeof db = db): Column {
    const column = tx
      .select()
      .from(columns)
      .where(and(eq(columns.repoId, repoId), eq(columns.kind, kind)))
      .get()
    if (!column) throw new Error(`Board ${repoId} is missing its ${kind} column`)
    return column
  }

  static createSystemColumns(repoId: number, tx: Tx) {
    return SYSTEM_COLUMNS.map((c, position) =>
      tx.insert(columns).values({ repoId, position, ...c }).returning().get()
    )
  }

  static create(repoId: number, name: string): Column {
    const column = db.transaction((tx) => {
      const { top } = tx
        .select({ top: max(columns.position) })
        .from(columns)
        .where(eq(columns.repoId, repoId))
        .get()!
      return tx
        .insert(columns)
        .values({ repoId, name, kind: "custom", position: (top ?? -1) + 1 })
        .returning()
        .get()
    })
    bus.publish({ type: "column.upserted", column })
    return column
  }

  static rename(id: number, name: string): Column {
    ColumnService.get(id)
    const column = db.update(columns).set({ name }).where(eq(columns.id, id)).returning().get()!
    bus.publish({ type: "column.upserted", column })
    return column
  }

  /** Moves a column to `index` (clamped); also renumbers positions densely. */
  static move(id: number, index: number): Column[] {
    const { repoId } = ColumnService.get(id)
    const reordered = db.transaction((tx) => {
      const ordered = ColumnService.listByRepo(repoId, tx)
      const from = ordered.findIndex((c) => c.id === id)
      const [column] = ordered.splice(from, 1)
      ordered.splice(Math.min(index, ordered.length), 0, column!)
      return ordered.map((c, position) =>
        tx.update(columns).set({ position }).where(eq(columns.id, c.id)).returning().get()!
      )
    })
    bus.publish({ type: "columns.reordered", repoId, columns: reordered })
    return reordered
  }

  static remove(id: number, moveCardsTo?: number) {
    const column = ColumnService.get(id)
    if (column.kind !== "custom") throw fail.badRequest("System columns cannot be deleted")

    const movedIds = db.transaction((tx) => {
      const contained = tx
        .select({ id: cards.id })
        .from(cards)
        .where(eq(cards.columnId, id))
        .orderBy(asc(cards.position))
        .all()

      if (contained.length > 0) {
        if (moveCardsTo === undefined) {
          throw fail.conflict("Column is not empty; choose a column to move its cards to")
        }
        const target = tx.select().from(columns).where(eq(columns.id, moveCardsTo)).get()
        if (
          !target ||
          target.id === id ||
          target.kind !== "custom" ||
          target.repoId !== column.repoId
        ) {
          throw fail.badRequest("Cards can only be moved to another custom column on the same board")
        }
        let position = CardService.nextPosition(target.id, tx)
        for (const card of contained) {
          tx.update(cards)
            .set({ columnId: target.id, position: position++ })
            .where(eq(cards.id, card.id))
            .run()
        }
      }

      tx.delete(columns).where(eq(columns.id, id)).run()
      return contained.map((c) => c.id)
    })

    for (const card of CardService.getMany(movedIds)) {
      bus.publish({ type: "card.upserted", card })
    }
    bus.publish({ type: "column.deleted", id })
  }
}

export type { Tx }
