import { MagnifyingGlassIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { LabelPicker } from "@/features/labels/LabelPicker"
import { useBoardStore } from "@/features/realtime/BoardStore"

/** Search and label filter in a bottom sheet, for narrow screens. */
export function MobileFilterSheet({
  q,
  labels: selected,
  onChange,
}: {
  q: string
  labels: number[]
  onChange: (next: { q?: string; labels?: number[] }) => void
}) {
  const { labels } = useBoardStore()
  const active = selected.filter((id) => labels.some((l) => l.id === id))
  const filtering = q.trim() !== "" || active.length > 0

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant={filtering ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label={filtering ? "Filter (Active)" : "Filter"}
            className="relative"
          />
        }
      >
        <MagnifyingGlassIcon />
        {filtering && (
          <span
            aria-hidden
            className="absolute top-1 right-1 size-1.5 rotate-45 bg-primary"
          />
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85svh]">
        <SheetHeader>
          <SheetTitle>Filter</SheetTitle>
          <SheetDescription>Titles, prompts and branches.</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-4 pt-2">
          <Input
            type="search"
            value={q}
            onChange={(e) => onChange({ q: e.target.value })}
            placeholder="Search"
            aria-label="Search cards"
          />
          <div className="flex flex-col gap-2">
            <Label>Match Any</Label>
            <div className="border bg-background/40 dark:bg-black/20">
              <LabelPicker
                labels={labels}
                selected={active}
                onChange={(ids) => onChange({ labels: ids })}
                empty="No Labels"
              />
            </div>
          </div>
        </div>
        <SheetFooter className="flex-row justify-end">
          <Button
            variant="outline"
            disabled={!filtering}
            onClick={() => onChange({ q: "", labels: [] })}
          >
            Clear
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
