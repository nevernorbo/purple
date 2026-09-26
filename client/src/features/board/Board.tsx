import { DndContext, DragOverlay } from "@dnd-kit/core"
import {
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable"
import {
  FolderSimpleIcon,
  MagnifyingGlassIcon,
  TagIcon,
} from "@phosphor-icons/react"
import type { Card, Column as ColumnType } from "purple-server"
import { useEffect, useMemo, useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CardDialog } from "@/features/cards/CardDialog"
import { CardItem } from "@/features/cards/CardItem"
import { cardActions } from "@/features/cards/actions"
import { AddColumnComposer } from "@/features/columns/AddColumnComposer"
import { Column } from "@/features/columns/Column"
import { DeleteColumnDialog } from "@/features/columns/DeleteColumnDialog"
import { LabelFilter } from "@/features/labels/LabelFilter"
import { LabelsDialog } from "@/features/labels/LabelsDialog"
import { useBoardStore } from "@/features/realtime/BoardStore"
import { EmptyState } from "@/features/repositories/EmptyState"
import { RepoSwitcher } from "@/features/repositories/RepoSwitcher"
import { ReposDialog } from "@/features/repositories/ReposDialog"
import { columnDndId } from "./dnd"
import { matchesFilter } from "./filter"
import { Logo } from "./Logo"
import { StatusIndicators } from "./StatusIndicators"
import { useBoardDnd } from "./useBoardDnd"
import { useHashState } from "./useHashState"

const byPosition = <T extends { position: number; id: number }>(a: T, b: T) =>
  a.position - b.position || a.id - b.id

export function Board() {
  const store = useBoardStore()
  const [hash, setHash] = useHashState()
  const [reposOpen, setReposOpen] = useState(false)
  const [labelsOpen, setLabelsOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deletingCard, setDeletingCard] = useState<Card | null>(null)
  const [deletingColumn, setDeletingColumn] = useState<ColumnType | null>(null)

  const repo = store.repos.find((r) => r.id === hash.repoId) ?? null

  // Fall back to the first board when the hash points nowhere (fresh load, deleted repo).
  useEffect(() => {
    if (store.loaded && !repo && store.repos.length > 0) {
      setHash({ repoId: store.repos[0]!.id })
    }
  }, [store.loaded, store.repos, repo, setHash])

  const columns = useMemo(
    () => store.columns.filter((c) => c.repoId === repo?.id).sort(byPosition),
    [store.columns, repo?.id]
  )
  const customColumns = useMemo(
    () => columns.filter((c) => c.kind === "custom"),
    [columns]
  )
  const filtering = hash.q.trim() !== "" || hash.labels.length > 0

  const cardsByColumn = useMemo(() => {
    const all = new Map<number, Card[]>()
    for (const card of store.cards) {
      if (card.repoId !== repo?.id) continue
      const list = all.get(card.columnId) ?? []
      list.push(card)
      all.set(card.columnId, list)
    }
    for (const list of all.values()) list.sort(byPosition)
    return all
  }, [store.cards, repo?.id])

  const visibleByColumn = useMemo(() => {
    if (!filtering) return cardsByColumn
    const visible = new Map<number, Card[]>()
    for (const [columnId, list] of cardsByColumn) {
      visible.set(
        columnId,
        list.filter((c) => matchesFilter(c, hash.q, hash.labels))
      )
    }
    return visible
  }, [cardsByColumn, filtering, hash.q, hash.labels])

  const dnd = useBoardDnd({
    repoId: repo?.id ?? 0,
    columns,
    allByColumn: cardsByColumn,
    visibleByColumn,
  })

  // Look the card up live so the dialog reflects status changes while open.
  const editingCard = store.cards.find((c) => c.id === editingId) ?? null

  return (
    <div className="flex h-svh flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2">
        <Logo />
        <span aria-hidden className="mx-1 h-4 w-px bg-border" />
        {store.repos.length > 0 && (
          <RepoSwitcher
            repoId={repo?.id ?? null}
            onChange={(repoId) => setHash({ repoId })}
          />
        )}
        {repo && (
          <>
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={hash.q}
                onChange={(e) => setHash({ q: e.target.value })}
                placeholder="Search cards"
                aria-label="Search cards"
                className="h-7 w-52 pl-7"
              />
            </div>
            <LabelFilter
              selected={hash.labels}
              onChange={(labels) => setHash({ labels })}
            />
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          <StatusIndicators
            running={store.running}
            connected={store.connected}
          />
          <Button variant="ghost" size="sm" onClick={() => setLabelsOpen(true)}>
            <TagIcon data-icon="inline-start" />
            Labels
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setReposOpen(true)}>
            <FolderSimpleIcon data-icon="inline-start" />
            Repos
          </Button>
        </div>
      </header>

      {!store.loaded ? (
        <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
          Connecting…
        </div>
      ) : store.repos.length === 0 ? (
        <EmptyState onAdded={(repoId) => setHash({ repoId })} />
      ) : (
        repo && (
          <DndContext {...dnd.contextProps}>
            <main className="flex min-h-0 flex-1 items-start gap-3 overflow-x-auto p-4">
              <SortableContext
                items={columns.map((c) => columnDndId(c.id))}
                strategy={horizontalListSortingStrategy}
              >
                {columns.map((column) => (
                  <Column
                    key={column.id}
                    column={column}
                    cards={dnd.cardsFor(column.id)}
                    totalCount={cardsByColumn.get(column.id)?.length ?? 0}
                    labels={store.labels}
                    customColumns={customColumns}
                    filtering={filtering}
                    onEditCard={(card) => setEditingId(card.id)}
                    onDeleteCard={setDeletingCard}
                    onDelete={() => setDeletingColumn(column)}
                  />
                ))}
              </SortableContext>
              <AddColumnComposer repoId={repo.id} />
            </main>
            <DragOverlay>
              {dnd.activeCard && (
                <CardItem
                  card={dnd.activeCard}
                  labels={store.labels}
                  moveTargets={[]}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  className="w-68 cursor-grabbing shadow-lg"
                />
              )}
            </DragOverlay>
          </DndContext>
        )
      )}

      <CardDialog card={editingCard} onClose={() => setEditingId(null)} />
      <LabelsDialog open={labelsOpen} onOpenChange={setLabelsOpen} />
      <ReposDialog
        open={reposOpen}
        onOpenChange={setReposOpen}
        onSelect={(repoId) => setHash({ repoId })}
      />
      <DeleteColumnDialog
        column={deletingColumn}
        cardCount={
          deletingColumn
            ? (cardsByColumn.get(deletingColumn.id)?.length ?? 0)
            : 0
        }
        targets={customColumns.filter((c) => c.id !== deletingColumn?.id)}
        onClose={() => setDeletingColumn(null)}
      />
      <AlertDialog
        open={deletingCard !== null}
        onOpenChange={(o) => !o && setDeletingCard(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deletingCard?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The card is removed from Purple. Branches and pull requests
              already pushed stay on GitHub.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deletingCard) void cardActions.remove(deletingCard.id)
                setDeletingCard(null)
              }}
            >
              Delete card
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
