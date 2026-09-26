import {
  ArrowRightIcon,
  ArrowClockwiseIcon,
  DotsThreeIcon,
  GitBranchIcon,
  PencilSimpleIcon,
  PlayIcon,
  StopIcon,
  TrashIcon,
  WarningIcon,
} from "@phosphor-icons/react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Card, Column, Label } from "purple-server"
import type { ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { relativeTime } from "@/lib/time"
import { cardDndId, type DragData } from "@/features/board/dnd"
import { LabelChip } from "@/features/labels/LabelChip"
import { cardActions } from "./actions"
import { CardStatus } from "./CardStatus"

interface CardItemProps extends ComponentProps<"article"> {
  card: Card
  labels: Label[]
  /** Custom columns on this board, excluding the card's current one. */
  moveTargets: Column[]
  onEdit: () => void
  onDelete: () => void
}

/** A card that can be dragged within and between columns. */
export function SortableCardItem({
  columnId,
  ...props
}: CardItemProps & { columnId: number }) {
  const { card } = props
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: cardDndId(card.id),
    data: { type: "card", card, columnId } satisfies DragData,
    disabled: card.status === "running",
  })

  return (
    <CardItem
      {...props}
      {...attributes}
      {...listeners}
      // The card holds its own buttons; it's announced as sortable, not as a button.
      role={undefined}
      ref={(node) => {
        setNodeRef(node)
        setActivatorNodeRef(node)
      }}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(isDragging && "opacity-40")}
    />
  )
}

const STRIPE: Partial<Record<Card["status"], string>> = {
  running: "bg-primary",
  completed: "bg-success",
  failed: "bg-destructive",
}

export function CardItem({
  card,
  labels,
  moveTargets,
  onEdit,
  onDelete,
  className,
  ...props
}: CardItemProps) {
  const running = card.status === "running"
  const hasPrompt = card.prompt.trim().length > 0
  const cardLabels = card.labelIds
    .map((id) => labels.find((l) => l.id === id))
    .filter((l): l is Label => Boolean(l))
  const stripe = STRIPE[card.status]

  return (
    <article
      {...props}
      className={cn(
        "group/card relative flex flex-col gap-3 border bg-card p-4 text-card-foreground shadow-[inset_0_1px_0_var(--edge)] transition-colors outline-none hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring/50",
        running && "animate-glow border-primary/60",
        className
      )}
    >
      {stripe && (
        <span
          aria-hidden
          className={cn("absolute inset-y-0 left-0 w-0.75", stripe)}
        />
      )}

      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="min-w-0 flex-1 text-left text-xl leading-snug font-normal [overflow-wrap:anywhere] outline-none after:absolute after:inset-0 focus-visible:underline"
        >
          {card.title}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Card actions"
                className="relative z-10 -mt-0.5 -mr-1 opacity-70 group-hover/card:opacity-100 aria-expanded:opacity-100"
              />
            }
          >
            <DotsThreeIcon weight="bold" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onEdit}>
              <PencilSimpleIcon />
              {running ? "View" : "Edit"}
            </DropdownMenuItem>
            {!running && moveTargets.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ArrowRightIcon />
                  Move To
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-40">
                  {moveTargets.map((column) => (
                    <DropdownMenuItem
                      key={column.id}
                      onClick={() => void cardActions.move(card.id, column.id)}
                    >
                      <span className="truncate">{column.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            {/* Completed cards have no footer action, so re-running lives here. */}
            {card.status === "completed" && (
              <DropdownMenuItem
                disabled={!hasPrompt}
                onClick={() => void cardActions.start(card.id)}
              >
                <ArrowClockwiseIcon />
                Re-run
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={running}
              onClick={onDelete}
            >
              <TrashIcon />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {cardLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {cardLabels.map((label) => (
            <LabelChip key={label.id} label={label} />
          ))}
        </div>
      )}

      {hasPrompt ? (
        <p className="line-clamp-2 font-mono text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
          {card.prompt}
        </p>
      ) : (
        <p className="inline-flex items-center gap-1.5 hud-caps text-sm text-warning">
          <WarningIcon className="size-3.5" />
          Needs Prompt
        </p>
      )}

      {card.branch && card.status !== "backlog" && (
        <p
          className="flex min-w-0 items-center gap-1 font-mono text-xs text-muted-foreground"
          title={card.branch}
        >
          <GitBranchIcon className="size-3.5 shrink-0" />
          <span className="truncate">{card.branch}</span>
        </p>
      )}

      <footer className="flex min-h-9 flex-wrap items-center gap-x-2 gap-y-2 border-t border-dashed pt-3 text-sm text-muted-foreground">
        <CardStatus card={card} />
        <span
          className="ml-auto shrink-0 hud-caps tabular-nums"
          title={new Date(card.updatedAt).toLocaleString()}
        >
          {relativeTime(card.updatedAt)}
        </span>
        <CardAction card={card} hasPrompt={hasPrompt} />
      </footer>
    </article>
  )
}

/** The card's one primary action, styled as a skill-bar slot. */
function CardAction({ card, hasPrompt }: { card: Card; hasPrompt: boolean }) {
  const action =
    card.status === "running"
      ? {
          label: "Stop",
          icon: <StopIcon weight="fill" />,
          run: cardActions.stop,
        }
      : !hasPrompt
        ? null
        : card.status === "backlog"
          ? {
              label: "Start",
              icon: <PlayIcon weight="fill" />,
              run: cardActions.start,
            }
          : card.status === "failed"
            ? {
                label: "Retry",
                icon: <ArrowClockwiseIcon weight="bold" />,
                run: cardActions.start,
              }
            : null
  if (!action) return null

  return (
    <Button
      variant="skill"
      size="sm"
      className="relative z-10"
      onClick={() => void action.run(card.id)}
    >
      <span data-icon="inline-start" className="contents">
        {action.icon}
      </span>
      {action.label}
    </Button>
  )
}
