import { diffLines } from "diff"

export type DiffLine =
  | {
      kind: "add" | "del" | "ctx"
      text: string
      oldNo?: number
      newNo?: number
    }
  | { kind: "skip"; count: number }

const CONTEXT = 3

function splitLines(value: string) {
  const lines = value.split("\n")
  if (lines.at(-1) === "") lines.pop()
  return lines
}

/** Unified line diff, with unchanged runs collapsed to `CONTEXT` lines around changes. */
export function lineDiff(before: string, after: string): DiffLine[] {
  const lines: DiffLine[] = []
  let oldNo = 1
  let newNo = 1
  for (const part of diffLines(before, after)) {
    for (const text of splitLines(part.value)) {
      if (part.added) lines.push({ kind: "add", text, newNo: newNo++ })
      else if (part.removed) lines.push({ kind: "del", text, oldNo: oldNo++ })
      else lines.push({ kind: "ctx", text, oldNo: oldNo++, newNo: newNo++ })
    }
  }

  const out: DiffLine[] = []
  let i = 0
  while (i < lines.length) {
    if (lines[i]!.kind !== "ctx") {
      out.push(lines[i++]!)
      continue
    }
    let end = i
    while (end < lines.length && lines[end]!.kind === "ctx") end++
    const keepHead = i === 0 ? 0 : CONTEXT
    const keepTail = end === lines.length ? 0 : CONTEXT
    if (end - i > keepHead + keepTail + 1) {
      out.push(...lines.slice(i, i + keepHead))
      out.push({ kind: "skip", count: end - i - keepHead - keepTail })
      out.push(...lines.slice(end - keepTail, end))
    } else {
      out.push(...lines.slice(i, end))
    }
    i = end
  }
  return out
}

export function diffStats(before: string, after: string) {
  let added = 0
  let removed = 0
  for (const part of diffLines(before, after)) {
    if (part.added) added += part.count ?? 0
    else if (part.removed) removed += part.count ?? 0
  }
  return { added, removed }
}
