import { and, asc, eq, inArray, max, ne } from "drizzle-orm"

import { db } from "../../db/client"
import { cardLabels, cards, columns, labels } from "../../db/schema"
import type { Card, CardRow } from "../../db/types"
import { fail } from "../../lib/errors"
import { bus } from "../realtime/bus"
import type { Tx } from "../columns/service"

type Conn = Tx | typeof db

function withLabels(rows: CardRow[], conn: Conn = db): Card[] {
  if (rows.length === 0) return []
  const links = conn
    .select()
    .from(cardLabels)
    .where(
      inArray(
        cardLabels.cardId,
        rows.map((r) => r.id)
      )
    )
    .all()
  const byCard = new Map<number, number[]>()
  for (const link of links) {
    const list = byCard.get(link.cardId) ?? []
    list.push(link.labelId)
    byCard.set(link.cardId, list)
  }
  return rows.map((row) => ({ ...row, labelIds: byCard.get(row.id) ?? [] }))
}

export interface CardInput {
  title: string
  prompt?: string
  labelIds?: number[]
}

export abstract class CardService {
  static list(): Card[] {
    const rows = db.select().from(cards).orderBy(asc(cards.position), asc(cards.id)).all()
    return withLabels(rows)
  }

  static find(id: number, conn: Conn = db): Card | undefined {
    const row = conn.select().from(cards).where(eq(cards.id, id)).get()
    return row ? withLabels([row], conn)[0] : undefined
  }

  static get(id: number, conn: Conn = db): Card {
    const card = CardService.find(id, conn)
    if (!card) throw fail.notFound("Card")
    return card
  }

  static getMany(ids: number[]): Card[] {
    if (ids.length === 0) return []
    return withLabels(db.select().from(cards).where(inArray(cards.id, ids)).all())
  }

  static nextPosition(columnId: number, conn: Conn = db) {
    const { top } = conn
      .select({ top: max(cards.position) })
      .from(cards)
      .where(eq(cards.columnId, columnId))
      .get()!
    return (top ?? -1) + 1
  }

  static create(columnId: number, input: CardInput): Card {
    const card = db.transaction((tx) => {
      const column = tx.select().from(columns).where(eq(columns.id, columnId)).get()
      if (!column) throw fail.notFound("Column")
      if (column.kind !== "custom") {
        throw fail.badRequest("Cards can only be added to custom columns")
      }
      const row = tx
        .insert(cards)
        .values({
          repoId: column.repoId,
          columnId,
          position: CardService.nextPosition(columnId, tx),
          title: input.title.trim(),
          prompt: input.prompt ?? "",
        })
        .returning()
        .get()
      if (input.labelIds) setLabels(tx, row.id, input.labelIds)
      return CardService.get(row.id, tx)
    })
    bus.publish({ type: "card.upserted", card })
    return card
  }

  static update(id: number, input: Partial<CardInput>): Card {
    const card = db.transaction((tx) => {
      const existing = CardService.get(id, tx)
      if (existing.status === "running") throw fail.conflict("Card is running")
      const patch: Partial<CardRow> = { updatedAt: Date.now() }
      if (input.title !== undefined) patch.title = input.title.trim()
      if (input.prompt !== undefined) patch.prompt = input.prompt
      if (input.labelIds !== undefined) setLabels(tx, id, input.labelIds)
      tx.update(cards).set(patch).where(eq(cards.id, id)).run()
      return CardService.get(id, tx)
    })
    bus.publish({ type: "card.upserted", card })
    return card
  }

  /**
   * Moves a card within or into a custom column, at `index` among the column's other cards
   * (bottom when omitted). Changing columns resets it to backlog. Renumbers the column densely.
   */
  static move(id: number, columnId: number, index?: number): Card {
    const changedIds = db.transaction((tx) => {
      const existing = CardService.get(id, tx)
      if (existing.status === "running") throw fail.conflict("Card is running")
      const target = tx.select().from(columns).where(eq(columns.id, columnId)).get()
      if (!target) throw fail.notFound("Column")
      if (target.kind !== "custom" || target.repoId !== existing.repoId) {
        throw fail.badRequest("Cards can only be moved to custom columns on the same board")
      }
      const sameColumn = target.id === existing.columnId
      if (sameColumn && index === undefined) return []
      if (!sameColumn) {
        tx.update(cards).set({ columnId, status: "backlog" }).where(eq(cards.id, id)).run()
      }

      const ordered = tx
        .select({ id: cards.id, position: cards.position })
        .from(cards)
        .where(and(eq(cards.columnId, columnId), ne(cards.id, id)))
        .orderBy(asc(cards.position), asc(cards.id))
        .all()
      ordered.splice(Math.min(index ?? ordered.length, ordered.length), 0, {
        id,
        position: sameColumn ? existing.position : -1,
      })
      const changed: number[] = []
      ordered.forEach((card, position) => {
        if (card.id !== id && card.position === position) return
        tx.update(cards).set({ position }).where(eq(cards.id, card.id)).run()
        changed.push(card.id)
      })
      return changed
    })
    for (const card of CardService.getMany(changedIds)) {
      bus.publish({ type: "card.upserted", card })
    }
    return CardService.get(id)
  }

  static remove(id: number) {
    const existing = CardService.get(id)
    if (existing.status === "running") throw fail.conflict("Card is running")
    db.delete(cards).where(eq(cards.id, id)).run()
    bus.publish({ type: "card.deleted", id })
  }
}

function setLabels(tx: Tx, cardId: number, labelIds: number[]) {
  const unique = [...new Set(labelIds)]
  if (unique.length > 0) {
    const found = tx.select({ id: labels.id }).from(labels).where(inArray(labels.id, unique)).all()
    if (found.length !== unique.length) throw fail.badRequest("Unknown label")
  }
  tx.delete(cardLabels).where(eq(cardLabels.cardId, cardId)).run()
  if (unique.length > 0) {
    tx.insert(cardLabels)
      .values(unique.map((labelId) => ({ cardId, labelId })))
      .run()
  }
}
