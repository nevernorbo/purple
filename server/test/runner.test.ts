import { describe, expect, it } from "bun:test"
import { eq } from "drizzle-orm"
import { existsSync, readFileSync } from "node:fs"

import { db } from "../src/db/client"
import { cards } from "../src/db/schema"
import { ColumnService } from "../src/features/columns/service"
import { reconcile } from "../src/features/runner/reconcile"
import { logPathFor, Runner } from "../src/features/runner/service"
import { worktreeFromBranch } from "../src/features/runner/slug"
import { request, setupBoard, waitForCard } from "./helpers"

async function readyCard(title: string, prompt: string) {
  const board = await setupBoard()
  const { data: card } = await request("POST", `/columns/${board.ready.id}/cards`, { title, prompt })
  return { ...board, card }
}

describe("runner", () => {
  it("runs the agent in a worktree and lands in Completed with the PR url", async () => {
    const { repo, repoId, git, card } = await readyCard("Add agent file", "Please add AGENT.md")
    const done = waitForCard(card.id, (c) => c.status !== "running")

    const { status, data: started } = await request("POST", `/cards/${card.id}/start`)
    expect(status).toBe(200)
    expect(started.status).toBe("running")
    expect(started.branch).toBe(`kanban/add-agent-file-${card.id}`)
    expect(started.columnId).toBe(ColumnService.system(repoId, "running").id)
    expect((await request("POST", `/cards/${card.id}/start`)).status).toBe(409)
    expect((await request("PATCH", `/cards/${card.id}`, { title: "nope" })).status).toBe(409)

    const finished = await done
    expect(readFileSync(logPathFor(card.id), "utf8")).toContain("pull/42")
    expect(finished.status).toBe("completed")
    expect(finished.exitCode).toBe(0)
    expect(finished.prUrl).toBe("https://github.com/acme/widgets/pull/42")
    expect(finished.columnId).toBe(ColumnService.system(repoId, "completed").id)
    expect(existsSync(worktreeFromBranch(repo, started.branch))).toBe(false)
    expect(await git("worktree", "list")).not.toContain(".worktrees")
    expect(await git("log", "--format=%s", "-1", started.branch)).toBe("agent change")
    expect(Runner.running).toBe(0)

    // Moving out of Completed resets it to backlog.
    const { data: board } = await request("POST", `/repos/${repoId}/columns`, { name: "Again" })
    const { data: moved } = await request("POST", `/cards/${card.id}/move`, { columnId: board.id })
    expect(moved.status).toBe("backlog")
  })

  it("lands in Failed on a non-zero exit", async () => {
    const { repoId, card } = await readyCard("Break", "FAKE:fail")
    const done = waitForCard(card.id, (c) => c.status !== "running")
    await request("POST", `/cards/${card.id}/start`)
    const finished = await done
    expect(finished.status).toBe("failed")
    expect(finished.exitCode).toBe(1)
    expect(finished.columnId).toBe(ColumnService.system(repoId, "failed").id)
  })

  it("stop kills the agent and fails the card", async () => {
    const { card } = await readyCard("Slow", "FAKE:sleep")
    const running = waitForCard(card.id, () => true)
    await request("POST", `/cards/${card.id}/start`)
    await running
    // Wait until the process is actually spawned.
    for (let i = 0; i < 50 && !readFileSync(logPathFor(card.id), "utf8").includes("spawned"); i++) {
      await Bun.sleep(50)
    }
    const done = waitForCard(card.id, (c) => c.status !== "running")
    expect((await request("POST", `/cards/${card.id}/stop`)).status).toBe(200)
    expect((await done).status).toBe("failed")
  })

  it("rejects starting a card without a prompt", async () => {
    const { card } = await readyCard("Empty", "   ")
    expect((await request("POST", `/cards/${card.id}/start`)).status).toBe(400)
  })

  it("reconcile fails orphaned running cards", async () => {
    const { repoId, card } = await readyCard("Orphan", "x")
    db.update(cards)
      .set({ status: "running", branch: `kanban/orphan-${card.id}` })
      .where(eq(cards.id, card.id))
      .run()
    await reconcile()
    const row = db.select().from(cards).where(eq(cards.id, card.id)).get()!
    expect(row.status).toBe("failed")
    expect(row.columnId).toBe(ColumnService.system(repoId, "failed").id)
  })
})

