import { and, eq, isNotNull, isNull } from "drizzle-orm"

import { config } from "../../config"
import { db } from "../../db/client"
import { cards, repositories } from "../../db/schema"
import { run } from "../../lib/proc"
import { CardService } from "../cards/service"
import { bus } from "../realtime/bus"

const MAX_SUMMARY = 2000
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/
const SUMMARY_TITLE = /\b(summary|overview|tl;?dr)\b/i

/** Lines paired with their heading level (0 for body text); `#` inside code fences isn't a heading. */
function scan(body: string) {
  let fenced = false
  return body.split("\n").map((text) => {
    if (/^\s*(```|~~~)/.test(text)) fenced = !fenced
    const match = fenced ? null : HEADING.exec(text)
    return { text, level: match ? match[1]!.length : 0, title: match?.[2] ?? "" }
  })
}

/**
 * Picks the part of a PR body worth showing on a card: the "Summary" section when there is
 * one, otherwise the text before the first heading (or the first section's body).
 */
export function extractSummary(body: string): string {
  const lines = scan(body.replace(/\r\n/g, "\n").replace(/<!--[\s\S]*?-->/g, "").trim())

  let start = lines.findIndex((l) => l.level > 0 && SUMMARY_TITLE.test(l.title))
  if (start === -1 && lines[0]?.level) start = 0
  let section: typeof lines
  if (start === -1) {
    const firstHeading = lines.findIndex((l) => l.level > 0)
    section = firstHeading === -1 ? lines : lines.slice(0, firstHeading)
  } else {
    const level = lines[start]!.level
    const end = lines.findIndex((l, i) => i > start && l.level > 0 && l.level <= level)
    section = lines.slice(start + 1, end === -1 ? undefined : end)
  }

  let summary = section
    .map((l) => l.text)
    .join("\n")
    .trim()
  if (summary.length > MAX_SUMMARY) {
    const cut = summary.lastIndexOf("\n", MAX_SUMMARY)
    summary = `${summary.slice(0, cut > 0 ? cut : MAX_SUMMARY).trimEnd()}\n…`
  }
  return summary
}

export abstract class PrSummary {
  /** Fetches the card's PR body with `gh` and stores its summary; keeps it null if `gh` fails. */
  static async refresh(cardId: number) {
    const card = CardService.find(cardId)
    if (!card?.prUrl) return card
    const repo = db.select().from(repositories).where(eq(repositories.id, card.repoId)).get()
    if (!repo) return card

    let body: string
    try {
      const result = await run(
        [config.ghBin, "pr", "view", card.prUrl, "--json", "body", "--jq", ".body"],
        repo.path
      )
      if (result.code !== 0) throw new Error(result.stderr || `exit ${result.code}`)
      body = result.stdout
    } catch (error) {
      console.warn(`gh pr view ${card.prUrl} failed: ${(error as Error).message}`)
      return card
    }

    // A re-run may have replaced the PR meanwhile; only write if it's still the same one.
    const updated = db
      .update(cards)
      // Keep updatedAt: fetching a summary isn't an edit (the schema bumps it by default).
      .set({ prSummary: extractSummary(body), updatedAt: card.updatedAt })
      .where(and(eq(cards.id, cardId), eq(cards.prUrl, card.prUrl)))
      .returning({ id: cards.id })
      .get()
    if (!updated) return CardService.find(cardId)
    const fresh = CardService.get(cardId)
    bus.publish({ type: "card.upserted", card: fresh })
    return fresh
  }

  /** Fills in summaries for cards whose PR was never fetched (e.g. finished before this existed). */
  static async backfill() {
    const pending = db
      .select({ id: cards.id })
      .from(cards)
      .where(and(isNotNull(cards.prUrl), isNull(cards.prSummary)))
      .all()
    for (const { id } of pending) await PrSummary.refresh(id)
  }
}
