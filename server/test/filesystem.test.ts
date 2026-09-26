import { describe, expect, it } from "bun:test"
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { FsService } from "../src/features/filesystem/service"
import { request } from "./helpers"

function tree() {
  const root = mkdtempSync(join(tmpdir(), "purple-fs-"))
  for (const dir of ["alpha", "Apple", "beta", ".hidden", "alpha/.git"]) {
    mkdirSync(join(root, dir), { recursive: true })
  }
  writeFileSync(join(root, "afile.txt"), "")
  symlinkSync(join(root, "beta"), join(root, "all-link"))
  return root
}

describe("path completion", () => {
  it("lists child directories of a path ending in /", () => {
    const root = tree()
    const names = FsService.complete(`${root}/`).map((e) => e.name)
    expect(names).toEqual(["all-link", "alpha", "Apple", "beta"])
  })

  it("filters by the typed prefix, case-insensitively, dirs only", () => {
    const root = tree()
    const entries = FsService.complete(`${root}/a`)
    expect(entries.map((e) => e.path)).toEqual([
      `${root}/all-link/`,
      `${root}/alpha/`,
      `${root}/Apple/`,
    ])
    expect(entries.find((e) => e.name === "alpha")?.isGitRepo).toBe(true)
    expect(entries.find((e) => e.name === "Apple")?.isGitRepo).toBe(false)
  })

  it("shows hidden directories only once a dot is typed", () => {
    const root = tree()
    expect(FsService.complete(`${root}/.`).map((e) => e.name)).toEqual([".hidden"])
  })

  it("keeps ~ in completed paths and defaults to home", () => {
    const home = FsService.complete("~/")
    const empty = FsService.complete("")
    expect(empty).toEqual(home)
    for (const entry of home) expect(entry.path.startsWith("~/")).toBe(true)
  })

  it("returns nothing for relative or missing paths", () => {
    expect(FsService.complete("relative/path")).toEqual([])
    expect(FsService.complete("/definitely/not/here/")).toEqual([])
  })

  it("is served behind auth", async () => {
    const root = tree()
    const { status, data } = await request("GET", `/fs/complete?path=${encodeURIComponent(`${root}/b`)}`)
    expect(status).toBe(200)
    expect(data).toEqual([{ path: `${root}/beta/`, name: "beta", isGitRepo: false }])
    const { app } = await import("../src/app")
    const res = await app.handle(new Request("http://localhost/api/fs/complete?path=/"))
    expect(res.status).toBe(401)
  })
})
