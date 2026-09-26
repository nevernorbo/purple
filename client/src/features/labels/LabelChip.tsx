import type { Label } from "purple-server"

import { Badge } from "@/components/ui/badge"
import { LABEL_COLORS } from "@/lib/label-colors"
import { cn } from "@/lib/utils"

export function LabelChip({
  label,
  className,
}: {
  label: Label
  className?: string
}) {
  return (
    <Badge
      variant="rarity"
      className={cn(
        "max-w-full justify-start truncate",
        LABEL_COLORS[label.color].chip,
        className
      )}
    >
      <span className="truncate">{label.name}</span>
    </Badge>
  )
}

export function LabelDot({ label }: { label: Label }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-2.5 shrink-0 rotate-45",
        LABEL_COLORS[label.color].dot
      )}
    />
  )
}
