import {
  ArrowRightIcon,
  ArrowClockwiseIcon,
  DotsThreeIcon,
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

  return (
    <article
      {...props}
      className={cn(
        "group/card relative flex flex-col gap-2 border bg-card p-2.5 text-card-foreground transition-colors outline-none hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-ring/50",
        running && "border-primary/40 bg-primary/[0.03]",
        className
      )}
    >
      {running && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-0.5 bg-primary"
        />
      )}

      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="min-w-0 flex-1 text-left text-xs leading-snug font-medium outline-none after:absolute after:inset-0 focus-visible:underline"
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
                className="relative z-10 -mt-0.5 -mr-1 opacity-60 group-hover/card:opacity-100 aria-expanded:opacity-100"
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
                  Move to
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
            {running ? (
              <DropdownMenuItem onClick={() => void cardActions.stop(card.id)}>
                <StopIcon />
                Stop agent
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                disabled={!hasPrompt}
                onClick={() => void cardActions.start(card.id)}
              >
                {card.status === "backlog" ? (
                  <PlayIcon />
                ) : (
                  <ArrowClockwiseIcon />
                )}
                {card.status === "backlog" ? "Start agent" : "Re-run agent"}
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
        <div className="flex flex-wrap gap-1">
          {cardLabels.map((label) => (
            <LabelChip key={label.id} label={label} />
          ))}
        </div>
      )}

      {hasPrompt ? (
        <p className="line-clamp-2 text-[11px] leading-relaxed whitespace-pre-line text-muted-foreground">
          {card.prompt}
        </p>
      ) : (
        <p className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400">
          <WarningIcon className="size-3.5" />
          Add a prompt to start this card
        </p>
      )}

      {card.branch && card.status !== "backlog" && (
        <p
          className="truncate font-mono text-[10px] text-muted-foreground"
          title={card.branch}
        >
          {card.branch}
        </p>
      )}

      <footer className="flex items-center gap-2 text-[11px] whitespace-nowrap text-muted-foreground">
        <CardStatus card={card} />
        <span
          className="ml-auto shrink-0"
          title={new Date(card.updatedAt).toLocaleString()}
        >
          {relativeTime(card.updatedAt)}
        </span>
        {!running && hasPrompt && card.status === "backlog" && (
          <Button
            variant="outline"
            size="xs"
            className="relative z-10 -my-1"
            onClick={() => void cardActions.start(card.id)}
          >
            <PlayIcon data-icon="inline-start" weight="fill" />
            Start
          </Button>
        )}
        {running && (
          <Button
            variant="outline"
            size="xs"
            className="relative z-10 -my-1"
            onClick={() => void cardActions.stop(card.id)}
          >
            <StopIcon data-icon="inline-start" weight="fill" />
            Stop
          </Button>
        )}
        {card.status === "failed" && hasPrompt && (
          <Button
            variant="outline"
            size="xs"
            className="relative z-10 -my-1"
            onClick={() => void cardActions.start(card.id)}
          >
            <ArrowClockwiseIcon data-icon="inline-start" />
            Retry
          </Button>
        )}
      </footer>
    </article>
  )
}
