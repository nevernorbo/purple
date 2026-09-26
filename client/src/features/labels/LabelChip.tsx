import type { Label } from "purple-server"
import { cn } from "@/lib/utils"

import { LABEL_COLORS } from "@/lib/label-colors"

export function LabelChip({
  label,
  className,
}: {
  label: Label
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-4.5 max-w-full items-center truncate px-1.5 text-[10px] font-medium ring-1 ring-inset",
        LABEL_COLORS[label.color].chip,
        className
      )}
    >
      {label.name}
    </span>
  )
}

export function LabelDot({ label }: { label: Label }) {
  return (
    <span
      aria-hidden
      className={cn("size-2 shrink-0", LABEL_COLORS[label.color].dot)}
    />
  )
}
