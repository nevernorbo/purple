import { asc, eq } from "drizzle-orm"

import { db } from "../../db/client"
import { labels, type LabelColor } from "../../db/schema"
import type { Label } from "../../db/types"
import { fail, isUniqueViolation } from "../../lib/errors"
import { bus } from "../realtime/bus"

export interface LabelInput {
  name: string
  color: LabelColor
}

function uniqueName<T>(fn: () => T): T {
  try {
    return fn()
  } catch (error) {
    if (isUniqueViolation(error)) throw fail.conflict("A label with that name already exists")
    throw error
  }
}

export abstract class LabelService {
  static list(): Label[] {
    return db.select().from(labels).orderBy(asc(labels.name)).all()
  }

  static create(input: LabelInput): Label {
    const label = uniqueName(() =>
      db
        .insert(labels)
        .values({ name: input.name.trim(), color: input.color })
        .returning()
        .get()
    )
    bus.publish({ type: "label.upserted", label })
    return label
  }

  static update(id: number, input: Partial<LabelInput>): Label {
    const patch: Partial<LabelInput> = { ...input }
    if (patch.name !== undefined) patch.name = patch.name.trim()
    const label = uniqueName(() =>
      db.update(labels).set(patch).where(eq(labels.id, id)).returning().get()
    )
    if (!label) throw fail.notFound("Label")
    bus.publish({ type: "label.upserted", label })
    return label
  }

  static remove(id: number) {
    const removed = db.delete(labels).where(eq(labels.id, id)).returning().get()
    if (!removed) throw fail.notFound("Label")
    bus.publish({ type: "label.deleted", id })
  }
}
