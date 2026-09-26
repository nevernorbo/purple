import {
  ArrowsClockwiseIcon,
  CaretDownIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react"
import DOMPurify from "dompurify"
import { marked } from "marked"
import { useLayoutEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// PR links open in a new tab and never hand the board a window.opener.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank")
    node.setAttribute("rel", "noreferrer noopener")
  }
})

/** The agent-written PR summary as sanitized markdown, collapsed to a few lines. */
export function PrSummary({
  summary,
  onRefresh,
}: {
  summary: string | null
  onRefresh: () => Promise<unknown>
}) {
  const [refreshing, setRefreshing] = useState(false)
  const html = useMemo(
    () =>
      summary
        ? DOMPurify.sanitize(marked.parse(summary, { async: false, gfm: true }))
        : "",
    [summary]
  )
  const bodyRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)

  useLayoutEffect(() => {
    const el = bodyRef.current
    if (el) setOverflows(el.scrollHeight > el.clientHeight + 1)
  }, [html])

  const refresh = async () => {
    setRefreshing(true)
    await onRefresh()
    setRefreshing(false)
  }

  return (
    <section className="flex shrink-0 flex-col gap-1.5 border border-l-2 border-l-success/60 bg-success/5 px-3 py-2">
      <div className="flex items-center gap-2">
        <h3 className="hud-caps text-xs font-semibold text-success">
          PR Summary
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="ml-auto"
          aria-label="Refresh PR summary"
          title="Fetch the summary from GitHub again"
          disabled={refreshing}
          onClick={refresh}
        >
          <ArrowsClockwiseIcon className={cn(refreshing && "animate-spin")} />
        </Button>
      </div>
      {summary === null ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <CircleNotchIcon className="size-3 animate-spin" />
          Fetching from GitHub…
        </p>
      ) : summary === "" ? (
        <p className="text-xs text-muted-foreground">
          The PR description has no summary.
        </p>
      ) : (
        <>
          <div
            ref={bodyRef}
            className={cn(
              "pr-summary",
              !expanded && "max-h-28 overflow-hidden",
              !expanded && overflows && "mask-b-from-60% mask-b-to-100%"
            )}
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {(overflows || expanded) && (
            <button
              type="button"
              className="inline-flex items-center gap-1 self-start hud-caps text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded((open) => !open)}
            >
              <CaretDownIcon
                className={cn(
                  "size-3 transition-transform",
                  expanded && "rotate-180"
                )}
              />
              {expanded ? "Show Less" : "Show More"}
            </button>
          )}
        </>
      )}
    </section>
  )
}
