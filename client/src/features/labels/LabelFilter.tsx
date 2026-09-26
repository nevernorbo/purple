import { FunnelSimpleIcon, XIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useBoardStore } from "@/features/realtime/BoardStore"
import { LabelPicker } from "./LabelPicker"

export function LabelFilter({
  selected,
  onChange,
}: {
  selected: number[]
  onChange: (ids: number[]) => void
}) {
  const { labels } = useBoardStore()
  const active = selected.filter((id) => labels.some((l) => l.id === id))

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant={active.length ? "secondary" : "outline"} size="sm">
            <FunnelSimpleIcon data-icon="inline-start" />
            {active.length
              ? `${active.length} label${active.length > 1 ? "s" : ""}`
              : "Filter"}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-60 gap-1 p-1">
        <div className="flex items-center justify-between px-2 pt-1 text-xs text-muted-foreground">
          <span>Show cards with any of</span>
          {active.length > 0 && (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Clear"
              onClick={() => onChange([])}
            >
              <XIcon />
            </Button>
          )}
        </div>
        <LabelPicker
          labels={labels}
          selected={active}
          onChange={onChange}
          empty="No labels yet. Create some from the Labels manager."
        />
      </PopoverContent>
    </Popover>
  )
}
