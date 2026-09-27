import {
  CheckCircleIcon,
  CircleNotchIcon,
  XCircleIcon,
} from "@phosphor-icons/react"
import type { ColumnKind } from "purple-server"
import type { ReactNode } from "react"

export type SystemKind = Exclude<ColumnKind, "custom">

export const SYSTEM_META: Record<
  SystemKind,
  {
    icon: ReactNode
    empty: string
    /** A `tint-*` class: colors `hud-strip`, and solid swatches via `bg-(--tint)`. */
    tint: string
    text: string
  }
> = {
  running: {
    icon: <CircleNotchIcon className="size-4" />,
    empty: "No Active Runs",
    tint: "tint-primary",
    text: "text-primary",
  },
  completed: {
    icon: <CheckCircleIcon className="size-4" />,
    empty: "No Completed Runs",
    tint: "tint-success",
    text: "text-success",
  },
  failed: {
    icon: <XCircleIcon className="size-4" />,
    empty: "No Failed Runs",
    tint: "tint-destructive",
    text: "text-destructive",
  },
}

/** System columns are grouped after the custom ones, in this order. */
export const SYSTEM_ORDER: SystemKind[] = ["running", "completed", "failed"]
