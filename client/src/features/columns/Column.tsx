import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  CheckCircleIcon,
  CircleNotchIcon,
  DotsThreeIcon,
  PencilSimpleIcon,
  TrashIcon,
  XCircleIcon,
} from "@phosphor-icons/react"
import type {
  Card,
  Column as ColumnType,
  ColumnKind,
  Label,
} from "purple-server"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { api, call } from "@/lib/api"
import { cn } from "@/lib/utils"
import { cardDndId, columnDndId, type DragData } from "@/features/board/dnd"
import { SortableCardItem } from "@/features/cards/CardItem"
import { AddCardComposer } from "./AddCardComposer"

const SYSTEM_META: Record<
  Exclude<ColumnKind, "custom">,
  { icon: ReactNode; empty: string }
> = {
  running: {
    icon: <CircleNotchIcon className="size-3.5 text-primary" />,
    empty: "Started cards run here.",
  },
  completed: {
    icon: (
      <CheckCircleIcon className="size-3.5 text-green-600 dark:text-green-400" />
    ),
    empty: "Finished runs land here with their PR.",
  },
  failed: {
    icon: <XCircleIcon className="size-3.5 text-destructive" />,
    empty: "Failed or stopped runs land here.",
  },
}

export function Column({
  column,
  cards,
  totalCount,
  labels,
  customColumns,
  filtering,
  onEditCard,
  onDeleteCard,
  onDelete,
}: {
  column: ColumnType
  /** Cards after filtering. */
  cards: Card[]
  totalCount: number
  labels: Label[]
  customColumns: ColumnType[]
  filtering: boolean
  onEditCard: (card: Card) => void
  onDeleteCard: (card: Card) => void
  onDelete: () => void
}) {
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(column.name)
  const system = column.kind === "custom" ? null : SYSTEM_META[column.kind]
  const moveTargets = customColumns.filter((c) => c.id !== column.id)
  const hasRunning = column.kind === "running" && totalCount > 0

  const commitRename = () => {
    setRenaming(false)
    const next = name.trim()
    if (!next || next === column.name) return setName(column.name)
    void call(api.columns({ id: column.id }).patch({ name: next }))
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: columnDndId(column.id),
    data: { type: "column", column } satisfies DragData,
    // Let text selection work while renaming.
    disabled: { draggable: renaming },
  })

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      aria-label={column.name}
      className={cn(
        "flex max-h-full w-72 shrink-0 flex-col border bg-muted/40",
        hasRunning && "border-primary/30",
        isDragging && "relative z-10 opacity-80 shadow-lg"
      )}
    >
      <header
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        // The header holds its own buttons; it's announced as sortable, not as a button.
        role={undefined}
        className={cn(
          "flex h-10 shrink-0 items-center gap-2 border-b px-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
          !renaming && "cursor-grab",
          isDragging && "cursor-grabbing"
        )}
      >
        {system?.icon && (
          <span
            className={cn(
              column.kind === "running" && hasRunning && "[&_svg]:animate-spin"
            )}
          >
            {system.icon}
          </span>
        )}
        {renaming ? (
          <Input
            autoFocus
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur()
              if (e.key === "Escape") {
                setName(column.name)
                setRenaming(false)
              }
            }}
            className="h-7 bg-card"
            aria-label="Column name"
          />
        ) : (
          <h2
            className="min-w-0 flex-1 cursor-text truncate text-xs font-semibold"
            onDoubleClick={() => {
              setName(column.name)
              setRenaming(true)
            }}
          >
            {column.name}
          </h2>
        )}
        {!renaming && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {filtering && cards.length !== totalCount
              ? `${cards.length}/${totalCount}`
              : totalCount}
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Column actions"
              />
            }
          >
            <DotsThreeIcon weight="bold" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={() => {
                setName(column.name)
                setRenaming(true)
              }}
            >
              <PencilSimpleIcon />
              Rename
            </DropdownMenuItem>
            {column.kind === "custom" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <TrashIcon />
                  Delete column
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        <SortableContext
          items={cards.map((card) => cardDndId(card.id))}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <SortableCardItem
              key={card.id}
              card={card}
              columnId={column.id}
              labels={labels}
              moveTargets={
                card.columnId === column.id ? moveTargets : customColumns
              }
              onEdit={() => onEditCard(card)}
              onDelete={() => onDeleteCard(card)}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && system && !filtering && (
          <p className="px-1 py-3 text-center text-[11px] text-muted-foreground">
            {system.empty}
          </p>
        )}
        {cards.length === 0 && filtering && totalCount > 0 && (
          <p className="px-1 py-3 text-center text-[11px] text-muted-foreground">
            No cards match the filter.
          </p>
        )}
        {column.kind === "custom" && <AddCardComposer columnId={column.id} />}
      </div>
    </section>
  )
}
