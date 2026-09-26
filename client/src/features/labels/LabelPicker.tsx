import { CheckIcon } from "@phosphor-icons/react"
import type { Label } from "purple-server"

import { cn } from "@/lib/utils"
import { LabelDot } from "./LabelChip"

export function LabelPicker({
  labels,
  selected,
  onChange,
  empty = "No labels yet.",
}: {
  labels: Label[]
  selected: number[]
  onChange: (ids: number[]) => void
  empty?: string
}) {
  if (labels.length === 0) {
    return <p className="px-1 py-2 text-xs text-muted-foreground">{empty}</p>
  }
  const toggle = (id: number) =>
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id]
    )

  return (
    <ul className="flex flex-col" role="listbox" aria-multiselectable>
      {labels.map((label) => {
        const active = selected.includes(label.id)
        return (
          <li key={label.id}>
            <button
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => toggle(label.id)}
              className={cn(
                "flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs outline-none hover:bg-muted focus-visible:bg-muted",
                active && "font-medium"
              )}
            >
              <LabelDot label={label} />
              <span className="flex-1 truncate">{label.name}</span>
              <CheckIcon className={cn("size-3.5", !active && "invisible")} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
