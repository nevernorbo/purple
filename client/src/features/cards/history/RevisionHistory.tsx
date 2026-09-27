import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react"
import type { CardRevision } from "purple-server"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { api, call } from "@/lib/api"
import { relativeTime, useNow } from "@/lib/time"
import { cn } from "@/lib/utils"
import { diffStats, lineDiff, type DiffLine } from "./lineDiff"

type Mode = "changes" | "current"

/**
 * Git-style history of a card's prompt: every save is a revision, each can be diffed
 * against its parent or the current version, and restoring adds a new revision on top.
 */
export function RevisionHistory({
  cardId,
  refreshKey,
  readOnly,
  onRestore,
}: {
  cardId: number
  /** Bumped after each save so the list picks up the new revision. */
  refreshKey: number
  readOnly?: boolean
  onRestore: (revision: CardRevision) => Promise<void>
}) {
  const [revisions, setRevisions] = useState<CardRevision[] | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [mode, setMode] = useState<Mode>("changes")
  const [restoring, setRestoring] = useState(false)
  const now = useNow(30_000)

  useEffect(() => {
    let cancelled = false
    void call(api.cards({ id: cardId }).revisions.get()).then((data) => {
      if (cancelled || !data) return
      setRevisions(data)
      setSelectedId(data[0]?.id ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [cardId, refreshKey])

  // Oldest revision is r1, like a commit count.
  const numberOf = useMemo(() => {
    const map = new Map<number, number>()
    revisions?.forEach((r, i) => map.set(r.id, revisions.length - i))
    return map
  }, [revisions])

  const stats = useMemo(
    () =>
      new Map(
        (revisions ?? []).map((r, i) => [
          r.id,
          diffStats(revisions![i + 1]?.prompt ?? "", r.prompt),
        ])
      ),
    [revisions]
  )

  if (!revisions) {
    return <p className="p-4 text-sm text-muted-foreground">Loading history…</p>
  }

  const head = revisions[0]!
  const index = Math.max(
    0,
    revisions.findIndex((r) => r.id === selectedId)
  )
  const selected = revisions[index]!
  const parent = revisions[index + 1]
  const [from, to, fromLabel, toLabel] =
    mode === "changes"
      ? [
          parent,
          selected,
          parent ? `r${numberOf.get(parent.id)}` : "empty",
          `r${numberOf.get(selected.id)}`,
        ]
      : [selected, head, `r${numberOf.get(selected.id)}`, "current"]
  const isHead =
    selected.title === head.title && selected.prompt === head.prompt

  const restore = async () => {
    setRestoring(true)
    await onRestore(selected)
    setRestoring(false)
  }

  return (
    <div className="grid min-h-0 flex-1 border max-sm:grid-rows-[auto_1fr] sm:grid-cols-[15rem_1fr]">
      <ol className="min-h-0 overflow-y-auto border-b bg-background/30 max-sm:max-h-44 sm:border-r sm:border-b-0">
        {revisions.map((revision) => {
          const n = numberOf.get(revision.id)
          const { added, removed } = stats.get(revision.id)!
          const active = revision.id === selected.id
          return (
            <li key={revision.id}>
              <button
                type="button"
                onClick={() => setSelectedId(revision.id)}
                className={cn(
                  "flex w-full flex-col gap-0.5 border-b border-border/60 px-3 py-2 text-left hover:bg-foreground/6",
                  active &&
                    "bg-primary/10 shadow-[inset_2px_0_0_var(--primary)]"
                )}
              >
                <span className="flex items-center gap-2 text-sm">
                  <span className="hud-caps font-semibold tabular-nums">
                    r{n}
                  </span>
                  {revision.id === head.id && (
                    <span className="hud-caps text-[11px] text-primary">
                      Current
                    </span>
                  )}
                  <span className="ml-auto font-mono text-[11px] tabular-nums">
                    <span className="text-success">+{added}</span>{" "}
                    <span className="text-destructive">−{removed}</span>
                  </span>
                </span>
                <span
                  className="truncate text-xs text-muted-foreground"
                  title={new Date(revision.createdAt).toLocaleString()}
                >
                  {relativeTime(revision.createdAt, now)}
                  {revision.restoredFrom !== null &&
                    numberOf.has(revision.restoredFrom) &&
                    ` · restored r${numberOf.get(revision.restoredFrom)}`}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      <div className="flex min-h-0 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b bg-panel-header/40 px-2 py-1.5">
          <ToggleGroup
            aria-label="Compare"
            size="sm"
            value={[mode]}
            onValueChange={([next]) => next && setMode(next as Mode)}
          >
            <ToggleGroupItem value="changes">Changes</ToggleGroupItem>
            <ToggleGroupItem value="current">Vs Current</ToggleGroupItem>
          </ToggleGroup>
          <span className="font-mono text-xs text-muted-foreground">
            {fromLabel} → {toLabel}
          </span>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="ml-auto"
              disabled={isHead || restoring}
              onClick={restore}
              title={isHead ? "This is the current version" : undefined}
            >
              <ArrowCounterClockwiseIcon data-icon="inline-start" />
              Restore r{numberOf.get(selected.id)}
            </Button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {from?.title !== to.title && from && (
            <div className="border-b px-3 py-2 font-mono text-xs">
              <span className="text-muted-foreground">title </span>
              <span className="text-destructive line-through">
                {from.title}
              </span>
              <span className="text-muted-foreground"> → </span>
              <span className="text-success">{to.title}</span>
            </div>
          )}
          <DiffView lines={lineDiff(from?.prompt ?? "", to.prompt)} />
        </div>
      </div>
    </div>
  )
}

function DiffView({ lines }: { lines: DiffLine[] }) {
  if (!lines.some((l) => l.kind === "add" || l.kind === "del")) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        No changes to the prompt.
      </p>
    )
  }
  return (
    <table className="w-full border-collapse font-mono text-xs leading-5">
      <tbody>
        {lines.map((line, i) =>
          line.kind === "skip" ? (
            <tr key={i} className="bg-foreground/4 text-muted-foreground">
              <td colSpan={3} className="px-3 py-0.5 text-center">
                ⋯ {line.count} unchanged line{line.count === 1 ? "" : "s"}
              </td>
            </tr>
          ) : (
            <tr
              key={i}
              className={cn(
                line.kind === "add" && "bg-success/12",
                line.kind === "del" && "bg-destructive/12"
              )}
            >
              <td className="w-10 pr-2 text-right text-muted-foreground/70 tabular-nums select-none">
                {line.oldNo}
              </td>
              <td className="w-10 pr-2 text-right text-muted-foreground/70 tabular-nums select-none">
                {line.newNo}
              </td>
              <td
                className={cn(
                  "pr-3 break-all whitespace-pre-wrap",
                  line.kind === "add" && "text-success",
                  line.kind === "del" && "text-destructive"
                )}
              >
                <span className="inline-block w-4 select-none">
                  {line.kind === "add" ? "+" : line.kind === "del" ? "−" : " "}
                </span>
                {line.text}
              </td>
            </tr>
          )
        )}
      </tbody>
    </table>
  )
}
