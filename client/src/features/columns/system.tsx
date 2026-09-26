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
  { icon: ReactNode; empty: string; accent: string; text: string }
> = {
  running: {
    icon: <CircleNotchIcon className="size-4" />,
    empty: "No Active Runs",
    accent: "bg-primary",
    text: "text-primary",
  },
  completed: {
    icon: <CheckCircleIcon className="size-4" />,
    empty: "No Completed Runs",
    accent: "bg-success",
    text: "text-success",
  },
  failed: {
    icon: <XCircleIcon className="size-4" />,
    empty: "No Failed Runs",
    accent: "bg-destructive",
    text: "text-destructive",
  },
}

/** System columns are grouped after the custom ones, in this order. */
export const SYSTEM_ORDER: SystemKind[] = ["running", "completed", "failed"]
