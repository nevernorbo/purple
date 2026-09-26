import type { LabelColor } from "purple-server"

export const LABEL_COLORS: Record<LabelColor, { dot: string; chip: string }> = {
  purple: {
    dot: "bg-purple-500",
    chip: "bg-purple-500/12 text-purple-700 ring-purple-500/30 dark:text-purple-300",
  },
  blue: {
    dot: "bg-blue-500",
    chip: "bg-blue-500/12 text-blue-700 ring-blue-500/30 dark:text-blue-300",
  },
  green: {
    dot: "bg-green-500",
    chip: "bg-green-500/12 text-green-700 ring-green-500/30 dark:text-green-300",
  },
  amber: {
    dot: "bg-amber-500",
    chip: "bg-amber-500/15 text-amber-800 ring-amber-500/35 dark:text-amber-300",
  },
  red: {
    dot: "bg-red-500",
    chip: "bg-red-500/12 text-red-700 ring-red-500/30 dark:text-red-300",
  },
  pink: {
    dot: "bg-pink-500",
    chip: "bg-pink-500/12 text-pink-700 ring-pink-500/30 dark:text-pink-300",
  },
  teal: {
    dot: "bg-teal-500",
    chip: "bg-teal-500/12 text-teal-700 ring-teal-500/30 dark:text-teal-300",
  },
  slate: {
    dot: "bg-slate-500",
    chip: "bg-slate-500/12 text-slate-700 ring-slate-500/30 dark:text-slate-300",
  },
}

export const LABEL_COLOR_KEYS = Object.keys(LABEL_COLORS) as LabelColor[]
