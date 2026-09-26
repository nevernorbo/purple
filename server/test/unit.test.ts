import { describe, expect, it } from "bun:test"

import { extractSummary } from "../src/features/runner/pr"
import { buildPrompt } from "../src/features/runner/prompt"
import { branchFor, slug, worktreeFromBranch } from "../src/features/runner/slug"

describe("slug", () => {
  it("lowercases and dashes", () => {
    expect(slug("Add CONTRIBUTING.md & docs!")).toBe("add-contributing-md-docs")
  })
  it("strips accents and trims dashes", () => {
    expect(slug("  --Café Überfix--  ")).toBe("cafe-uberfix")
  })
  it("caps length without a trailing dash", () => {
    const value = slug("a".repeat(39) + " bbbb")
    expect(value.length).toBeLessThanOrEqual(40)
    expect(value.endsWith("-")).toBe(false)
  })
  it("falls back when nothing is left", () => {
    expect(slug("!!!")).toBe("task")
  })
  it("derives branch and worktree", () => {
    const branch = branchFor("Fix login", 7)
    expect(branch).toBe("kanban/fix-login-7")
    expect(worktreeFromBranch("/r", branch)).toBe("/r/.worktrees/fix-login-7")
  })
})

describe("buildPrompt", () => {
  it("appends the mandatory final task", () => {
    const prompt = buildPrompt({ prompt: "Do it", title: "My card", branch: "kanban/my-card-1" })
    expect(prompt.startsWith("Do it\n\n---\nMANDATORY FINAL TASK:\n")).toBe(true)
    expect(prompt).toContain("`git push -u origin kanban/my-card-1`")
    expect(prompt).toContain('gh pr create --title "My card" --body')
  })
  it("escapes shell-significant characters in the title", () => {
    const prompt = buildPrompt({ prompt: "x", title: 'Say "hi" $HOME `x`', branch: "b" })
    expect(prompt).toContain('--title "Say \\"hi\\" \\$HOME \\`x\\`"')
  })
})

describe("extractSummary", () => {
  it("takes the Summary section up to the next heading of the same level", () => {
    const body = "Intro\n\n## Summary\n- a\n### Detail\n- b\n\n## Testing\n- c"
    expect(extractSummary(body)).toBe("- a\n### Detail\n- b")
  })

  it("ignores headings inside code fences and HTML comments", () => {
    const body = "<!-- ## Summary -->\n# Summary\n```sh\n# not a heading\n```\ndone\n# Next"
    expect(extractSummary(body)).toBe("```sh\n# not a heading\n```\ndone")
  })

  it("falls back to the text before the first heading, or the first section", () => {
    expect(extractSummary("Fixes the bug.\n\n## Details\nx")).toBe("Fixes the bug.")
    expect(extractSummary("## What\nDid a thing\n## Why\nx")).toBe("Did a thing")
    expect(extractSummary("plain body")).toBe("plain body")
    expect(extractSummary("")).toBe("")
  })

  it("caps long summaries at a line break", () => {
    const summary = extractSummary(Array.from({ length: 400 }, (_, i) => `- line ${i}`).join("\n"))
    expect(summary.length).toBeLessThan(2100)
    expect(summary.endsWith("\n…")).toBe(true)
  })
})
