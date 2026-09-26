import { describe, expect, it } from "bun:test"

import { request, setupBoard } from "./helpers"

describe("repositories", () => {
  it("creates the three system columns", async () => {
    const { repoId } = await setupBoard()
    const { data: cards } = await request("GET", "/cards")
    expect(Array.isArray(cards)).toBe(true)
    const { ColumnService } = await import("../src/features/columns/service")
    const kinds = ColumnService.listByRepo(repoId).map((c) => c.kind)
    expect(kinds).toEqual(["running", "completed", "failed", "custom"])
  })

  it("rejects non-repositories and duplicates", async () => {
    const { repo } = await setupBoard()
    expect((await request("POST", "/repos", { path: "/definitely/missing" })).status).toBe(400)
    expect((await request("POST", "/repos", { path: repo })).status).toBe(409)
  })

  it("requires the token", async () => {
    const { app } = await import("../src/app")
    const res = await app.handle(new Request("http://localhost/api/cards"))
    expect(res.status).toBe(401)
  })
})

describe("columns", () => {
  it("renames and moves any column, deletes only custom ones", async () => {
    const { repoId, ready } = await setupBoard()
    const { ColumnService } = await import("../src/features/columns/service")
    const running = ColumnService.system(repoId, "running")

    expect((await request("PATCH", `/columns/${running.id}`, { name: "In flight" })).data.name).toBe(
      "In flight"
    )
    const { data: moved } = await request("POST", `/columns/${ready.id}/move`, { direction: "left" })
    expect(moved.map((c: { kind: string }) => c.kind)).toEqual([
      "running",
      "completed",
      "custom",
      "failed",
    ])
    const { data: edge } = await request("POST", `/columns/${running.id}/move`, { direction: "left" })
    expect(edge[0].id).toBe(running.id)

    expect((await request("DELETE", `/columns/${running.id}`)).status).toBe(400)
    expect((await request("DELETE", `/columns/${ready.id}`)).status).toBe(200)
  })

  it("requires a target custom column when deleting a non-empty column", async () => {
    const { repoId, ready } = await setupBoard()
    const { data: other } = await request("POST", `/repos/${repoId}/columns`, { name: "Later" })
    const { data: card } = await request("POST", `/columns/${ready.id}/cards`, { title: "A" })
    const { ColumnService } = await import("../src/features/columns/service")
    const failed = ColumnService.system(repoId, "failed")

    expect((await request("DELETE", `/columns/${ready.id}`)).status).toBe(409)
    expect(
      (await request("DELETE", `/columns/${ready.id}`, { moveCardsTo: failed.id })).status
    ).toBe(400)
    expect((await request("DELETE", `/columns/${ready.id}`, { moveCardsTo: other.id })).status).toBe(
      200
    )
    const { data: cards } = await request("GET", "/cards")
    expect(cards.find((c: { id: number }) => c.id === card.id).columnId).toBe(other.id)
  })
})

describe("cards", () => {
  it("cannot be created in or moved to system columns", async () => {
    const { repoId, ready } = await setupBoard()
    const { ColumnService } = await import("../src/features/columns/service")
    const completed = ColumnService.system(repoId, "completed")

    expect((await request("POST", `/columns/${completed.id}/cards`, { title: "x" })).status).toBe(400)
    const { data: card } = await request("POST", `/columns/${ready.id}/cards`, { title: "x" })
    expect((await request("POST", `/cards/${card.id}/move`, { columnId: completed.id })).status).toBe(
      400
    )
  })

  it("appends to the bottom of a column", async () => {
    const { ready } = await setupBoard()
    const a = (await request("POST", `/columns/${ready.id}/cards`, { title: "a" })).data
    const b = (await request("POST", `/columns/${ready.id}/cards`, { title: "b" })).data
    expect(b.position).toBeGreaterThan(a.position)
  })

  it("replaces labels and drops them when a label is deleted", async () => {
    const { ready } = await setupBoard()
    const bug = (await request("POST", "/labels", { name: `bug-${ready.id}`, color: "red" })).data
    const ui = (await request("POST", "/labels", { name: `ui-${ready.id}`, color: "blue" })).data
    expect((await request("POST", "/labels", { name: `ui-${ready.id}`, color: "red" })).status).toBe(
      409
    )

    const card = (
      await request("POST", `/columns/${ready.id}/cards`, { title: "c", labelIds: [bug.id] })
    ).data
    expect(card.labelIds).toEqual([bug.id])
    const updated = (await request("PATCH", `/cards/${card.id}`, { labelIds: [ui.id] })).data
    expect(updated.labelIds).toEqual([ui.id])

    await request("DELETE", `/labels/${ui.id}`)
    const { data: cards } = await request("GET", "/cards")
    expect(cards.find((c: { id: number }) => c.id === card.id).labelIds).toEqual([])
  })

  it("rejects unknown labels", async () => {
    const { ready } = await setupBoard()
    const res = await request("POST", `/columns/${ready.id}/cards`, { title: "c", labelIds: [99999] })
    expect(res.status).toBe(400)
  })
})
