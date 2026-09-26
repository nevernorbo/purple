import { DndContext, DragOverlay } from "@dnd-kit/core"
import {
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable"
import { GitBranchIcon, MagnifyingGlassIcon } from "@phosphor-icons/react"
import type { Card, ColumnKind, Column as ColumnType } from "purple-server"
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
} from "react"

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
import { Input } from "@/components/ui/input"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { cardActions } from "@/features/cards/actions"
import { CardDialog } from "@/features/cards/CardDialog"
import { CardItem } from "@/features/cards/CardItem"
import { AddColumnComposer } from "@/features/columns/AddColumnComposer"
import { Column } from "@/features/columns/Column"
import { DeleteColumnDialog } from "@/features/columns/DeleteColumnDialog"
import { SYSTEM_ORDER } from "@/features/columns/system"
import { LabelFilter } from "@/features/labels/LabelFilter"
import { LabelsDialog } from "@/features/labels/LabelsDialog"
import { useBoardStore } from "@/features/realtime/BoardStore"
import { EmptyState } from "@/features/repositories/EmptyState"
import { useIsMobile } from "@/hooks/use-mobile"
import { AppSidebar } from "./AppSidebar"
import { columnDndId } from "./dnd"
import { matchesFilter } from "./filter"
import { MobileBoard } from "./MobileBoard"
import { MobileFilterSheet } from "./MobileFilterSheet"
import { useBoardDnd } from "./useBoardDnd"
import { useHashState } from "./useHashState"

const byPosition = <T extends { position: number; id: number }>(a: T, b: T) =>
  a.position - b.position || a.id - b.id

const COLLAPSED_KEY = "purple.collapsedColumns"

/** Which system column kinds are collapsed to a rail, remembered per browser. */
function useCollapsedKinds() {
  const [kinds, setKinds] = useState<ColumnKind[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? "[]")
      return Array.isArray(stored) ? stored : []
    } catch {
      return []
    }
  })
  const toggle = useCallback((kind: ColumnKind) => {
    setKinds((current) => {
      const next = current.includes(kind)
        ? current.filter((k) => k !== kind)
        : [...current, kind]
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next))
      } catch {
        // Storage can be unavailable (private mode); collapsing still works.
      }
      return next
    })
  }, [])
  return [kinds, toggle] as const
}

/** The sidebar component writes its open state to a cookie; read it back. */
const sidebarDefaultOpen = () =>
  !document.cookie.includes("sidebar_state=false")

export function Board() {
  const store = useBoardStore()
  const [hash, setHash] = useHashState()
  const isMobile = useIsMobile()
  const [collapsedKinds, toggleCollapsed] = useCollapsedKinds()
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
  const systemColumns = useMemo(
    () =>
      SYSTEM_ORDER.flatMap((kind) => columns.filter((c) => c.kind === kind)),
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

  const counts = useMemo(
    () =>
      new Map(columns.map((c) => [c.id, cardsByColumn.get(c.id)?.length ?? 0])),
    [columns, cardsByColumn]
  )

  const dnd = useBoardDnd({
    repoId: repo?.id ?? 0,
    columns,
    allByColumn: cardsByColumn,
    visibleByColumn,
    lockToColumn: isMobile,
  })

  // Look the card up live so the dialog reflects status changes while open.
  const editingCard = store.cards.find((c) => c.id === editingId) ?? null

  const renderColumn = (
    column: ColumnType,
    extra?: Partial<ComponentProps<typeof Column>>
  ) => (
    <Column
      key={column.id}
      column={column}
      cards={dnd.cardsFor(column.id)}
      totalCount={counts.get(column.id) ?? 0}
      labels={store.labels}
      customColumns={customColumns}
      filtering={filtering}
      onEditCard={(card) => setEditingId(card.id)}
      onDeleteCard={setDeletingCard}
      onDelete={() => setDeletingColumn(column)}
      {...extra}
    />
  )

  return (
    <SidebarProvider defaultOpen={sidebarDefaultOpen()} className="h-svh">
      <AppSidebar
        repoId={repo?.id ?? null}
        onSelect={(repoId) => setHash({ repoId })}
        onOpenLabels={() => setLabelsOpen(true)}
      />
      <SidebarInset className="h-svh min-w-0 overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-panel/70 px-3 shadow-[inset_0_-1px_0_color-mix(in_oklch,var(--primary)_25%,transparent)] backdrop-blur-md md:px-4">
          <GitBranchIcon />
          <h1 className="min-w-0 truncate hud-caps text-2xl leading-tight font-normal md:text-3xl">
            {repo?.name ?? "Purple"}
          </h1>
          {repo &&
            (isMobile ? (
              <div className="ml-auto">
                <MobileFilterSheet
                  q={hash.q}
                  labels={hash.labels}
                  onChange={setHash}
                />
              </div>
            ) : (
              <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">
                <div className="relative w-full max-w-xs">
                  <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    value={hash.q}
                    onChange={(e) => setHash({ q: e.target.value })}
                    placeholder="SEARCH"
                    aria-label="Search cards"
                    className="h-10 pl-8"
                  />
                </div>
                <LabelFilter
                  selected={hash.labels}
                  onChange={(labels) => setHash({ labels })}
                />
              </div>
            ))}
        </header>

        {!store.loaded ? (
          <BoardSkeleton mobile={isMobile} />
        ) : store.repos.length === 0 ? (
          <EmptyState onAdded={(repoId) => setHash({ repoId })} />
        ) : (
          repo && (
            <DndContext {...dnd.contextProps}>
              {isMobile ? (
                <MobileBoard
                  // Start on the first column again when switching boards.
                  key={repo.id}
                  repoId={repo.id}
                  columns={[...customColumns, ...systemColumns]}
                  counts={counts}
                  renderColumn={(column) =>
                    renderColumn(column, { layout: "mobile" })
                  }
                />
              ) : (
                <div className="flex min-h-0 flex-1 items-start gap-4 overflow-x-auto p-5">
                  <SortableContext
                    items={customColumns.map((c) => columnDndId(c.id))}
                    strategy={horizontalListSortingStrategy}
                  >
                    {customColumns.map((column) => renderColumn(column))}
                  </SortableContext>
                  <AddColumnComposer repoId={repo.id} />
                  {systemColumns.length > 0 && (
                    <div
                      aria-hidden
                      className="mx-1 w-px shrink-0 self-stretch bg-linear-to-b from-transparent via-border to-transparent"
                    />
                  )}
                  {systemColumns.map((column) =>
                    renderColumn(
                      column,
                      column.kind === "running"
                        ? undefined
                        : {
                            collapsed: collapsedKinds.includes(column.kind),
                            onToggleCollapsed: () =>
                              toggleCollapsed(column.kind),
                          }
                    )
                  )}
                </div>
              )}
              <DragOverlay>
                {dnd.activeCard && (
                  <CardItem
                    card={dnd.activeCard}
                    labels={store.labels}
                    moveTargets={[]}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    className={
                      isMobile
                        ? "w-[calc(100vw-50px)] cursor-grabbing shadow-2xl"
                        : "w-73.5 cursor-grabbing shadow-2xl"
                    }
                  />
                )}
              </DragOverlay>
            </DndContext>
          )
        )}
      </SidebarInset>

      <CardDialog card={editingCard} onClose={() => setEditingId(null)} />
      <LabelsDialog open={labelsOpen} onOpenChange={setLabelsOpen} />
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
            <AlertDialogTitle>Delete Card?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="text-foreground">{deletingCard?.title}</span>.
              Pushed branches and PRs stay on GitHub.
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
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}

function BoardSkeleton({ mobile }: { mobile: boolean }) {
  return (
    <div
      aria-label="Connecting"
      className="flex min-h-0 flex-1 items-start gap-4 overflow-hidden p-5"
    >
      {Array.from({ length: mobile ? 1 : 4 }, (_, i) => (
        <div
          key={i}
          className="flex w-full shrink-0 flex-col gap-3 hud-panel p-3 md:w-80"
        >
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-24" />
          <Skeleton className="h-20" />
        </div>
      ))}
    </div>
  )
}
