import { PlusIcon } from "@phosphor-icons/react"
import type { Column as ColumnType } from "purple-server"
import { useEffect, useRef, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"
import { AddColumnComposer } from "@/features/columns/AddColumnComposer"
import { SYSTEM_META } from "@/features/columns/system"

const ADD_SLIDE = "add"

/**
 * One full-width column at a time: a tab strip of column names on top and a
 * scroll-snapped strip below that can be swiped. The two stay in sync.
 */
export function MobileBoard({
  repoId,
  columns,
  counts,
  renderColumn,
}: {
  repoId: number
  columns: ColumnType[]
  counts: Map<number, number>
  renderColumn: (column: ColumnType) => ReactNode
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const tabs = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<string>(
    columns[0] ? String(columns[0].id) : ADD_SLIDE
  )

  // Follow swipes: whichever slide is mostly visible is the active tab.
  useEffect(() => {
    const root = scroller.current
    if (!root) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.slide
          if (entry.isIntersecting && id) setActive(id)
        }
      },
      { root, threshold: 0.6 }
    )
    for (const slide of root.querySelectorAll("[data-slide]"))
      observer.observe(slide)
    return () => observer.disconnect()
  }, [columns])

  // Keep the active tab visible in the (scrollable) tab strip.
  useEffect(() => {
    tabs.current
      ?.querySelector(`[data-tab="${active}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [active])

  const show = (id: string) => {
    scroller.current?.querySelector(`[data-slide="${id}"]`)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    })
  }

  const tabClass =
    "flex h-9 shrink-0 items-center gap-2 px-3 hud-tab hud-caps text-base font-bold tracking-wider [--tab-border-width:var(--frame-width)] [--tab-outline-offset:3px]"

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={tabs}
        role="tablist"
        aria-label="Columns"
        className="flex shrink-0 [scrollbar-width:none] gap-3 overflow-x-auto hud-bar p-2.5"
      >
        {columns.map((column) => {
          const id = String(column.id)
          const system =
            column.kind === "custom" ? null : SYSTEM_META[column.kind]
          const selected = active === id
          return (
            <button
              key={column.id}
              type="button"
              role="tab"
              data-tab={id}
              aria-selected={selected}
              onClick={() => show(id)}
              className={tabClass}
            >
              {system && (
                <span
                  aria-hidden
                  className={cn("size-2 rotate-45 bg-(--tint)", system.tint)}
                />
              )}
              <span className="max-w-36 truncate">{column.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {counts.get(column.id) ?? 0}
              </span>
            </button>
          )
        })}
        <button
          type="button"
          role="tab"
          data-tab={ADD_SLIDE}
          aria-selected={active === ADD_SLIDE}
          aria-label="Add column"
          onClick={() => show(ADD_SLIDE)}
          className={tabClass}
        >
          <PlusIcon className="size-4" />
        </button>
      </div>

      <div
        ref={scroller}
        className="flex min-h-0 flex-1 snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain"
      >
        {columns.map((column) => (
          <div
            key={column.id}
            data-slide={column.id}
            role="tabpanel"
            className="h-full w-full shrink-0 snap-start snap-always p-3"
          >
            {renderColumn(column)}
          </div>
        ))}
        <div
          data-slide={ADD_SLIDE}
          className="h-full w-full shrink-0 snap-start snap-always p-3"
        >
          <AddColumnComposer repoId={repoId} className="w-full" />
        </div>
      </div>
    </div>
  )
}
