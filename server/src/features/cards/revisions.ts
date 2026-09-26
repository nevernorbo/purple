import { desc, eq } from "drizzle-orm"

import { db } from "../../db/client"
import { cardRevisions } from "../../db/schema"
import type { Card, CardRevision } from "../../db/types"
import type { Tx } from "../columns/service"

type Conn = Tx | typeof db

export abstract class RevisionService {
  static latest(cardId: number, conn: Conn = db): CardRevision | undefined {
    return conn
      .select()
      .from(cardRevisions)
      .where(eq(cardRevisions.cardId, cardId))
      .orderBy(desc(cardRevisions.id))
      .limit(1)
      .get()
  }

  /** Cards from before revisions existed get their current content as the first revision. */
  static ensureBaseline(card: Card, conn: Conn = db) {
    if (RevisionService.latest(card.id, conn)) return
    conn
      .insert(cardRevisions)
      .values({ cardId: card.id, title: card.title, prompt: card.prompt, createdAt: card.updatedAt })
      .run()
  }

  /** Records the card's current title and prompt unless they match the latest revision. */
  static record(card: Card, conn: Conn = db, restoredFrom?: number) {
    const latest = RevisionService.latest(card.id, conn)
    if (latest && latest.title === card.title && latest.prompt === card.prompt) return
    conn
      .insert(cardRevisions)
      .values({ cardId: card.id, title: card.title, prompt: card.prompt, restoredFrom })
      .run()
  }

  /** Newest first. */
  static list(cardId: number, conn: Conn = db): CardRevision[] {
    return conn
      .select()
      .from(cardRevisions)
      .where(eq(cardRevisions.cardId, cardId))
      .orderBy(desc(cardRevisions.id))
      .all()
  }
}
