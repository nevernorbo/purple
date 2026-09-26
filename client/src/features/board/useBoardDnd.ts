import {
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DroppableContainer,
} from "@dnd-kit/core"
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import type { Card, Column } from "purple-server"
import { useCallback, useState } from "react"

import { api, call } from "@/lib/api"
import { cardActions } from "@/features/cards/actions"
import { useBoardStore } from "@/features/realtime/BoardStore"
import type { DragData } from "./dnd"

const dataOf = (c: { data: { current?: unknown } } | null | undefined) =>
  c?.data.current as DragData | undefined

interface CardDrag {
  card: Card
  /** Where the card started, so dropping back onto a system column restores it. */
  origin: { columnId: number; index: number }
  /** Visible card ids per column, rearranged live while dragging. */
  draft: Map<number, number[]>
}

/**
 * Drag and drop for the board: columns reorder horizontally; cards reorder
 * within and move between custom columns. Drops apply optimistically and roll
 * back if the server rejects them.
 */
export function useBoardDnd({
  repoId,
  columns,
  allByColumn,
  visibleByColumn,
}: {
  repoId: number
  columns: Column[]
  allByColumn: Map<number, Card[]>
  visibleByColumn: Map<number, Card[]>
}) {
  const { cards: storeCards, apply } = useBoardStore()
  const [cardDrag, setCardDrag] = useState<CardDrag | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const kindOf = (columnId: number) =>
    columns.find((c) => c.id === columnId)?.kind

  const originColumnId = cardDrag?.origin.columnId
  const collisionDetection = useCallback<CollisionDetection>(
    (args) => {
      if (dataOf(args.active)?.type === "column") {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (c) => dataOf(c)?.type === "column"
          ),
        })
      }

      // Cards only land in custom columns, or back in the column they came
      // from. System columns aren't sortable, so their cards are never targets.
      const allowed = args.droppableContainers.filter((c) => {
        const data = dataOf(c)
        if (data?.type === "column")
          return (
            data.column.kind === "custom" || data.column.id === originColumnId
          )
        return (
          data?.type === "card" &&
          columns.find((col) => col.id === data.columnId)?.kind === "custom"
        )
      })
      const within = pointerWithin({ ...args, droppableContainers: allowed })
      const hits = within.length
        ? within
        : rectIntersection({ ...args, droppableContainers: allowed })

      const byId = new Map<unknown, DroppableContainer>(
        allowed.map((c) => [c.id, c])
      )
      const cardHit = hits.find((h) => dataOf(byId.get(h.id))?.type === "card")
      if (cardHit) return [cardHit]
      const columnHit = hits[0] && dataOf(byId.get(hits[0].id))
      if (columnHit?.type !== "column") return []

      // Over a column's empty space: snap to its nearest card, if any.
      const cardsInColumn = allowed.filter((c) => {
        const data = dataOf(c)
        return data?.type === "card" && data.columnId === columnHit.column.id
      })
      return cardsInColumn.length
        ? closestCenter({ ...args, droppableContainers: cardsInColumn })
        : [hits[0]!]
    },
    [columns, originColumnId]
  )

  const onDragStart = ({ active }: DragStartEvent) => {
    const data = dataOf(active)
    if (data?.type !== "card") return
    const draft = new Map<number, number[]>()
    for (const column of columns) {
      draft.set(
        column.id,
        (visibleByColumn.get(column.id) ?? []).map((c) => c.id)
      )
    }
    setCardDrag({
      card: data.card,
      origin: {
        columnId: data.columnId,
        index: draft.get(data.columnId)?.indexOf(data.card.id) ?? 0,
      },
      draft,
    })
  }

  const containerOf = (draft: Map<number, number[]>, cardId: number) => {
    for (const [columnId, ids] of draft)
      if (ids.includes(cardId)) return columnId
    return undefined
  }

  /** Moves the dragged card into another column as the pointer crosses over. */
  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!cardDrag || !over) return
    const overData = dataOf(over)
    const cardId = cardDrag.card.id
    const from = containerOf(cardDrag.draft, cardId)
    const to =
      overData?.type === "column"
        ? overData.column.id
        : overData?.type === "card"
          ? containerOf(cardDrag.draft, overData.card.id)
          : undefined
    if (from === undefined || to === undefined || from === to) return

    const target = cardDrag.draft.get(to) ?? []
    let index = target.length
    if (to === cardDrag.origin.columnId && kindOf(to) !== "custom") {
      index = cardDrag.origin.index
    } else if (overData?.type === "card") {
      const overIndex = target.indexOf(overData.card.id)
      const translated = active.rect.current.translated
      const below =
        translated !== null &&
        translated.top > over.rect.top + over.rect.height / 2
      index = overIndex + (below ? 1 : 0)
    }

    const draft = new Map(cardDrag.draft)
    draft.set(
      from,
      draft.get(from)!.filter((id) => id !== cardId)
    )
    draft.set(to, [...target.slice(0, index), cardId, ...target.slice(index)])
    setCardDrag({ ...cardDrag, draft })
  }

  const dropColumn = (columnId: number, overId: number) => {
    const from = columns.findIndex((c) => c.id === columnId)
    const to = columns.findIndex((c) => c.id === overId)
    if (from === -1 || to === -1 || from === to) return
    const previous = columns
    apply({
      type: "columns.reordered",
      repoId,
      columns: arrayMove(columns, from, to).map((c, position) => ({
        ...c,
        position,
      })),
    })
    void call(api.columns({ id: columnId }).move.post({ index: to })).then(
      (result) => {
        if (!result)
          apply({ type: "columns.reordered", repoId, columns: previous })
      }
    )
  }

  const dropCard = (drag: CardDrag, overCardId: number | undefined) => {
    const { card } = drag
    const columnId = containerOf(drag.draft, card.id)
    if (columnId === undefined || kindOf(columnId) !== "custom") return

    let visible = drag.draft.get(columnId)!
    if (overCardId !== undefined && visible.includes(overCardId)) {
      visible = arrayMove(
        visible,
        visible.indexOf(card.id),
        visible.indexOf(overCardId)
      )
    }

    // The visible list may be filtered; place the card next to its visible
    // neighbour within the column's full list.
    const others = (allByColumn.get(columnId) ?? []).filter(
      (c) => c.id !== card.id
    )
    const at = visible.indexOf(card.id)
    const prev = others.findIndex((c) => c.id === visible[at - 1])
    const next = others.findIndex((c) => c.id === visible[at + 1])
    const index = prev !== -1 ? prev + 1 : next !== -1 ? next : others.length

    const live = storeCards.find((c) => c.id === card.id) ?? card
    const sameColumn = live.columnId === columnId
    if (
      sameColumn &&
      (allByColumn.get(columnId) ?? []).findIndex((c) => c.id === card.id) ===
        index
    )
      return
    const ordered = [...others]
    ordered.splice(index, 0, live)

    const previous: Card[] = []
    ordered.forEach((c, position) => {
      const moved = c.id === card.id
      if (!moved && c.position === position) return
      previous.push(c)
      apply({
        type: "card.upserted",
        card: {
          ...c,
          position,
          ...(moved && !sameColumn && { columnId, status: "backlog" as const }),
        },
      })
    })
    void cardActions.move(card.id, columnId, index).then((result) => {
      if (result) return
      for (const c of previous) apply({ type: "card.upserted", card: c })
    })
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const data = dataOf(active)
    const overData = dataOf(over)
    if (data?.type === "column" && overData?.type === "column") {
      dropColumn(data.column.id, overData.column.id)
    } else if (data?.type === "card" && cardDrag) {
      dropCard(
        cardDrag,
        overData?.type === "card" ? overData.card.id : undefined
      )
    }
    setCardDrag(null)
  }

  /** Cards to render for a column, following the in-progress drag if any. */
  const cardsFor = (columnId: number): Card[] => {
    if (!cardDrag) return visibleByColumn.get(columnId) ?? []
    return (cardDrag.draft.get(columnId) ?? [])
      .map((id) => storeCards.find((c) => c.id === id))
      .filter((c): c is Card => Boolean(c))
  }

  return {
    activeCard: cardDrag
      ? (storeCards.find((c) => c.id === cardDrag.card.id) ?? cardDrag.card)
      : null,
    cardsFor,
    contextProps: {
      sensors,
      collisionDetection,
      onDragStart,
      onDragOver,
      onDragEnd,
      onDragCancel: () => setCardDrag(null),
    },
  }
}
