import { CheckIcon } from "@phosphor-icons/react"
import type { Label } from "purple-server"

import { cn } from "@/lib/utils"
import { LabelDot } from "./LabelChip"

export function LabelPicker({
  labels,
  selected,
  onChange,
  empty = "No Labels",
}: {
  labels: Label[]
  selected: number[]
  onChange: (ids: number[]) => void
  empty?: string
}) {
  if (labels.length === 0) {
    return <p className="px-2.5 py-2 text-sm text-muted-foreground">{empty}</p>
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
                "flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-sm outline-none hover:bg-foreground/6 focus-visible:bg-foreground/6",
                active &&
                  "bg-primary/10 font-semibold shadow-[inset_2px_0_0_var(--primary)]"
              )}
            >
              <LabelDot label={label} />
              <span className="flex-1 truncate">{label.name}</span>
              <CheckIcon
                weight="bold"
                className={cn("size-3.5 text-primary", !active && "invisible")}
              />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
