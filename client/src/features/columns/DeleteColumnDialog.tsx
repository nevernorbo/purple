import type { Column } from "purple-server"
import { useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api, call } from "@/lib/api"

export function DeleteColumnDialog({
  column,
  cardCount,
  targets,
  onClose,
}: {
  column: Column | null
  cardCount: number
  /** Other custom columns on the same board. */
  targets: Column[]
  onClose: () => void
}) {
  const [target, setTarget] = useState<number | null>(null)
  const needsTarget = cardCount > 0
  const blocked = needsTarget && targets.length === 0
  const items = targets.map((c) => ({ value: c.id, label: c.name }))

  const confirm = () => {
    if (!column) return
    const moveCardsTo = needsTarget ? (target ?? undefined) : undefined
    void call(api.columns({ id: column.id }).delete({ moveCardsTo }))
    onClose()
  }

  return (
    <AlertDialog
      open={column !== null}
      onOpenChange={(open) => {
        if (!open) {
          setTarget(null)
          onClose()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {column?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {!needsTarget && "Empty column."}
            {needsTarget &&
              !blocked &&
              `Move ${cardCount} card${cardCount === 1 ? "" : "s"} to:`}
            {blocked && "Its cards have nowhere to go. Add a column first."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {needsTarget && !blocked && (
          <Select items={items} value={target} onValueChange={setTarget}>
            <SelectTrigger className="w-full" aria-label="Move cards to">
              <SelectValue placeholder="Move To" />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={blocked || (needsTarget && target === null)}
            onClick={confirm}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
