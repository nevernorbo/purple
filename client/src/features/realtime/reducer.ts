import type { BoardEvent, BoardSnapshot } from "purple-server"

export interface BoardState extends BoardSnapshot {
  loaded: boolean
}

export const initialBoardState: BoardState = {
  loaded: false,
  repos: [],
  columns: [],
  cards: [],
  labels: [],
  running: 0,
}

function upsert<T extends { id: number }>(list: T[], item: T) {
  const index = list.findIndex((x) => x.id === item.id)
  if (index === -1) return [...list, item]
  const next = list.slice()
  next[index] = item
  return next
}

const without = <T extends { id: number }>(list: T[], id: number) =>
  list.filter((x) => x.id !== id)

export function boardReducer(state: BoardState, event: BoardEvent): BoardState {
  switch (event.type) {
    case "snapshot": {
      const { repos, columns, cards, labels, running } = event
      return { repos, columns, cards, labels, running, loaded: true }
    }
    case "repo.upserted":
      return { ...state, repos: upsert(state.repos, event.repo) }
    case "repo.deleted":
      return {
        ...state,
        repos: without(state.repos, event.id),
        columns: state.columns.filter((c) => c.repoId !== event.id),
        cards: state.cards.filter((c) => c.repoId !== event.id),
      }
    case "column.upserted":
      return { ...state, columns: upsert(state.columns, event.column) }
    case "column.deleted":
      return { ...state, columns: without(state.columns, event.id) }
    case "columns.reordered":
      return {
        ...state,
        columns: [
          ...state.columns.filter((c) => c.repoId !== event.repoId),
          ...event.columns,
        ],
      }
    case "card.upserted":
      return { ...state, cards: upsert(state.cards, event.card) }
    case "card.deleted":
      return { ...state, cards: without(state.cards, event.id) }
    case "label.upserted":
      return { ...state, labels: upsert(state.labels, event.label) }
    case "label.deleted":
      return {
        ...state,
        labels: without(state.labels, event.id),
        cards: state.cards.map((c) =>
          c.labelIds.includes(event.id)
            ? { ...c, labelIds: c.labelIds.filter((id) => id !== event.id) }
            : c
        ),
      }
    case "runner.count":
      return { ...state, running: event.running }
  }
}
