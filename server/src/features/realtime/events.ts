import type { Card, Column, Label, Repo } from "../../db/types"

export interface BoardSnapshot {
  repos: Repo[]
  columns: Column[]
  cards: Card[]
  labels: Label[]
  running: number
}

export type BoardEvent =
  | ({ type: "snapshot" } & BoardSnapshot)
  | { type: "repo.upserted"; repo: Repo }
  | { type: "repo.deleted"; id: number }
  | { type: "column.upserted"; column: Column }
  | { type: "column.deleted"; id: number }
  | { type: "columns.reordered"; repoId: number; columns: Column[] }
  | { type: "card.upserted"; card: Card }
  | { type: "card.deleted"; id: number }
  | { type: "label.upserted"; label: Label }
  | { type: "label.deleted"; id: number }
  | { type: "runner.count"; running: number }
