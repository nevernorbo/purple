import { sql } from "drizzle-orm"
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

export const COLUMN_KINDS = ["custom", "running", "completed", "failed"] as const
export const SYSTEM_COLUMN_KINDS = ["running", "completed", "failed"] as const
export const CARD_STATUSES = ["backlog", "running", "completed", "failed"] as const
export const LABEL_COLORS = [
  "purple",
  "blue",
  "green",
  "amber",
  "red",
  "pink",
  "teal",
  "slate",
] as const

export type ColumnKind = (typeof COLUMN_KINDS)[number]
export type SystemColumnKind = (typeof SYSTEM_COLUMN_KINDS)[number]
export type CardStatus = (typeof CARD_STATUSES)[number]
export type LabelColor = (typeof LABEL_COLORS)[number]

const now = () => Date.now()

export const repositories = sqliteTable("repositories", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  path: text().notNull().unique(),
  createdAt: integer().notNull().$defaultFn(now),
})

export const columns = sqliteTable(
  "columns",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    repoId: integer()
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    name: text().notNull(),
    kind: text({ enum: COLUMN_KINDS }).notNull().default("custom"),
    position: integer().notNull(),
    createdAt: integer().notNull().$defaultFn(now),
  },
  (t) => [
    index("columns_repo_idx").on(t.repoId),
    uniqueIndex("columns_repo_system_kind_idx")
      .on(t.repoId, t.kind)
      .where(sql`kind != 'custom'`),
  ]
)

export const cards = sqliteTable(
  "cards",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    repoId: integer()
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    columnId: integer()
      .notNull()
      .references(() => columns.id, { onDelete: "restrict" }),
    position: integer().notNull(),
    title: text().notNull(),
    prompt: text().notNull().default(""),
    status: text({ enum: CARD_STATUSES }).notNull().default("backlog"),
    branch: text(),
    exitCode: integer(),
    prUrl: text(),
    createdAt: integer().notNull().$defaultFn(now),
    updatedAt: integer().notNull().$defaultFn(now).$onUpdateFn(now),
    startedAt: integer(),
    finishedAt: integer(),
  },
  (t) => [
    index("cards_column_idx").on(t.columnId),
    index("cards_status_idx").on(t.status),
  ]
)

/** Snapshot of a card's title and prompt, one per save that changed either. */
export const cardRevisions = sqliteTable(
  "card_revisions",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    cardId: integer()
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    title: text().notNull(),
    prompt: text().notNull(),
    /** Set when this revision was created by restoring an older one. */
    restoredFrom: integer(),
    createdAt: integer().notNull().$defaultFn(now),
  },
  (t) => [index("card_revisions_card_idx").on(t.cardId, t.id)]
)

export const labels = sqliteTable("labels", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
  color: text({ enum: LABEL_COLORS }).notNull(),
  createdAt: integer().notNull().$defaultFn(now),
})

export const cardLabels = sqliteTable(
  "card_labels",
  {
    cardId: integer()
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    labelId: integer()
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.cardId, t.labelId] }),
    index("card_labels_label_idx").on(t.labelId),
  ]
)

export const table = {
  repositories,
  columns,
  cards,
  cardRevisions,
  labels,
  cardLabels,
} as const
