import type { Subprocess } from "bun"
import { eq } from "drizzle-orm"
import { appendFileSync, closeSync, openSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { config } from "../../config"
import { db } from "../../db/client"
import { cards, repositories } from "../../db/schema"
import type { Card, Repo } from "../../db/types"
import { fail } from "../../lib/errors"
import { CardService } from "../cards/service"
import { ColumnService } from "../columns/service"
import { bus } from "../realtime/bus"
import { Git } from "./git"
import { PrSummary } from "./pr"
import { buildPrompt } from "./prompt"
import { branchFor, worktreeFromBranch } from "./slug"

/** Cards between "marked running" and "finished" — includes worktree setup. */
const active = new Set<number>()
const processes = new Map<number, Subprocess>()
const stopped = new Set<number>()

const PR_URL = /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/

/** Env vars that make a spawned `claude` think it is nested inside another session. */
const STRIPPED_ENV = ["CLAUDECODE", "CLAUDE_CODE_ENTRYPOINT"]

export const logPathFor = (cardId: number) => join(config.logsDir, `${cardId}.log`)

function publishCount() {
  bus.publish({ type: "runner.count", running: active.size })
}

function agentEnv() {
  const env: Record<string, string | undefined> = { ...process.env }
  for (const key of STRIPPED_ENV) delete env[key]
  return env
}

function log(cardId: number, line: string) {
  appendFileSync(logPathFor(cardId), `[purple ${new Date().toISOString()}] ${line}\n`)
}

export abstract class Runner {
  static get running() {
    return active.size
  }

  /** Marks the card running, then prepares the worktree and spawns claude in the background. */
  static start(cardId: number): Card {
    const card = CardService.get(cardId)
    if (card.status === "running" || active.has(cardId)) throw fail.conflict("Card is already running")
    if (!card.prompt.trim()) throw fail.badRequest("Card has no prompt")
    const repo = db.select().from(repositories).where(eq(repositories.id, card.repoId)).get()
    if (!repo) throw fail.notFound("Repository")

    const branch = branchFor(card.title, card.id)
    const updated = db.transaction((tx) => {
      const column = ColumnService.system(card.repoId, "running", tx)
      tx.update(cards)
        .set({
          status: "running",
          columnId: column.id,
          position: CardService.nextPosition(column.id, tx),
          branch,
          exitCode: null,
          prUrl: null,
          prSummary: null,
          startedAt: Date.now(),
          finishedAt: null,
          updatedAt: Date.now(),
        })
        .where(eq(cards.id, cardId))
        .run()
      return CardService.get(cardId, tx)
    })

    active.add(cardId)
    bus.publish({ type: "card.upserted", card: updated })
    publishCount()

    void Runner.launch(updated, repo, branch).catch((error: Error) => {
      log(cardId, `launch failed: ${error.message}`)
      void Runner.finish(updated, repo, branch, null)
    })
    return updated
  }

  static stop(cardId: number) {
    const proc = processes.get(cardId)
    if (!proc) throw fail.conflict("Card is not running")
    stopped.add(cardId)
    proc.kill()
  }

  /** Kills every agent; used on shutdown so no orphans keep pushing. */
  static stopAll() {
    for (const [cardId, proc] of processes) {
      stopped.add(cardId)
      proc.kill()
    }
  }

  private static async launch(card: Card, repo: Repo, branch: string) {
    const logPath = logPathFor(card.id)
    const worktree = worktreeFromBranch(repo.path, branch)
    writeFileSync(logPath, "")
    log(card.id, `card #${card.id} "${card.title}" → ${branch}`)
    log(card.id, `worktree ${worktree}`)

    await Git.addWorktree(repo.path, branch, worktree)
    Git.linkShared(repo.path, worktree)

    const prompt = buildPrompt({ prompt: card.prompt, title: card.title, branch })
    const fd = openSync(logPath, "a")
    let proc: Subprocess
    try {
      proc = Bun.spawn([config.claudeBin, "-p", prompt, "--dangerously-skip-permissions"], {
        cwd: worktree,
        env: agentEnv(),
        stdin: "ignore",
        stdout: fd,
        stderr: fd,
      })
    } finally {
      closeSync(fd)
    }
    processes.set(card.id, proc)
    log(card.id, `spawned ${config.claudeBin} (pid ${proc.pid})`)

    const code = await proc.exited
    processes.delete(card.id)
    await Runner.finish(card, repo, branch, code)
  }

  private static async finish(card: Card, repo: Repo, branch: string, code: number | null) {
    const wasStopped = stopped.delete(card.id)
    log(card.id, wasStopped ? `stopped (exit ${code})` : `exited with code ${code}`)

    try {
      await Git.removeWorktree(repo.path, worktreeFromBranch(repo.path, branch))
    } catch (error) {
      log(card.id, `worktree cleanup failed: ${(error as Error).message}`)
    }

    let prUrl: string | null = null
    try {
      prUrl = readFileSync(logPathFor(card.id), "utf8").match(PR_URL)?.[0] ?? null
    } catch {}

    const succeeded = code === 0 && !wasStopped
    const status = succeeded ? "completed" : "failed"
    try {
      const updated = db.transaction((tx) => {
        // The card or its board may have been deleted meanwhile (only possible via direct DB edits).
        if (!CardService.find(card.id, tx)) return undefined
        const column = ColumnService.system(card.repoId, status, tx)
        tx.update(cards)
          .set({
            status,
            columnId: column.id,
            position: CardService.nextPosition(column.id, tx),
            exitCode: code,
            prUrl,
            prSummary: null,
            finishedAt: Date.now(),
            updatedAt: Date.now(),
          })
          .where(eq(cards.id, card.id))
          .run()
        return CardService.get(card.id, tx)
      })
      if (updated) bus.publish({ type: "card.upserted", card: updated })
      // The card lands in its column right away; the summary follows once gh answers.
      if (updated?.prUrl) void PrSummary.refresh(updated.id)
    } finally {
      active.delete(card.id)
      publishCount()
    }
  }
}
