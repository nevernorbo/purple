import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  CaretLineRightIcon,
  DotsThreeIcon,
  PencilSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import type { Card, Column as ColumnType, Label } from "purple-server"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
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
import { SYSTEM_META } from "./system"

export function Column({
  column,
  cards,
  totalCount,
  labels,
  customColumns,
  filtering,
  layout = "desktop",
  collapsed = false,
  onToggleCollapsed,
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
  /** `mobile` fills its (full-width) container and can't be reordered. */
  layout?: "desktop" | "mobile"
  /** Collapsed to a thin rail (desktop system columns only). */
  collapsed?: boolean
  onToggleCollapsed?: () => void
  onEditCard: (card: Card) => void
  onDeleteCard: (card: Card) => void
  onDelete: () => void
}) {
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(column.name)
  const system = column.kind === "custom" ? null : SYSTEM_META[column.kind]
  const moveTargets = customColumns.filter((c) => c.id !== column.id)
  const hasRunning = column.kind === "running" && totalCount > 0
  const mobile = layout === "mobile"
  const count =
    filtering && cards.length !== totalCount
      ? `${cards.length}/${totalCount}`
      : totalCount

  const startRename = () => {
    setName(column.name)
    setRenaming(true)
  }

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
    // System columns stay put (they still register as drop targets so a card
    // can go back where it came from); text selection works while renaming.
    disabled: { draggable: renaming || system !== null || mobile },
  })
  const draggable = !renaming && system === null && !mobile

  if (collapsed && system) {
    return (
      <section
        ref={setNodeRef}
        aria-label={column.name}
        className="relative flex max-h-full w-16 shrink-0 flex-col items-center hud-panel"
      >
        <span
          aria-hidden
          className={cn("h-1 w-full bg-(--tint)", system.tint)}
        />
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={`Expand ${column.name}`}
          aria-expanded={false}
          className="flex w-full flex-1 flex-col items-center gap-3 px-1 py-3 outline-none hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
        >
          <span className={system.text}>{system.icon}</span>
          <Badge variant="count">{count}</Badge>
          <span className="hud-caps text-xl font-bold tracking-wider [writing-mode:vertical-rl]">
            {column.name}
          </span>
        </button>
      </section>
    )
  }

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      aria-label={column.name}
      className={cn(
        "group/column hud-corners relative flex shrink-0 flex-col hud-panel p-1.5",
        mobile ? "h-full w-full" : "max-h-full w-80",
        hasRunning && "border-primary/50",
        isDragging && "z-10 opacity-80 shadow-2xl"
      )}
    >
      <header
        ref={setActivatorNodeRef}
        {...(draggable ? { ...attributes, ...listeners } : {})}
        // The header holds its own buttons; it's announced as sortable, not as a button.
        role={undefined}
        className={cn(
          "flex h-14 shrink-0 items-center gap-2 hud-strip px-3 focus-visible:outline-ring",
          system?.tint,
          draggable && "cursor-grab",
          isDragging && "cursor-grabbing"
        )}
      >
        {system && (
          <span
            className={cn(system.text, hasRunning && "[&_svg]:animate-spin")}
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
            className="h-8"
            aria-label="Column name"
          />
        ) : (
          <>
            <h2
              className="min-w-0 truncate hud-caps text-xl leading-tight font-normal"
              onDoubleClick={startRename}
            >
              {column.name}
            </h2>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Rename ${column.name}`}
              onClick={startRename}
              className="opacity-0 group-hover/column:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
            >
              <PencilSimpleIcon />
            </Button>
          </>
        )}
        {!renaming && (
          <Badge variant="count" className="ml-auto">
            {count}
          </Badge>
        )}
        {onToggleCollapsed && !renaming && (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Collapse ${column.name}`}
            aria-expanded
            onClick={onToggleCollapsed}
          >
            <CaretLineRightIcon />
          </Button>
        )}
        {system === null && (
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
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={startRename}>
                <PencilSimpleIcon />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <TrashIcon />
                Delete Column
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
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
          <p className="px-2 py-8 text-center hud-caps text-base text-muted-foreground">
            {system.empty}
          </p>
        )}
        {cards.length === 0 && filtering && totalCount > 0 && (
          <p className="px-2 py-8 text-center hud-caps text-base text-muted-foreground">
            No Matches
          </p>
        )}
        {column.kind === "custom" && <AddCardComposer columnId={column.id} />}
      </div>
    </section>
  )
}
