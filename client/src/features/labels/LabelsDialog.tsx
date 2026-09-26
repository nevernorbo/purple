import { PlusIcon, TrashIcon } from "@phosphor-icons/react"
import type { Label, LabelColor } from "purple-server"
import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { api, call } from "@/lib/api"
import { LABEL_COLOR_KEYS, LABEL_COLORS } from "@/lib/label-colors"
import { cn } from "@/lib/utils"
import { useBoardStore } from "@/features/realtime/BoardStore"

function ColorSwatches({
  value,
  onChange,
}: {
  value: LabelColor
  onChange: (color: LabelColor) => void
}) {
  return (
    <div
      className="flex flex-wrap gap-1"
      role="radiogroup"
      aria-label="Label color"
    >
      {LABEL_COLOR_KEYS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={LABEL_COLORS[color].rarity}
          title={LABEL_COLORS[color].rarity}
          onClick={() => onChange(color)}
          className={cn(
            "size-6 cursor-pointer shadow-[inset_0_1px_0_oklch(1_0_0/0.35),inset_0_-2px_0_oklch(0_0_0/0.2)] outline-none focus-visible:ring-2 focus-visible:ring-ring",
            LABEL_COLORS[color].dot,
            value === color && "ring-2 ring-foreground"
          )}
        />
      ))}
    </div>
  )
}

function ColorButton({ label }: { label: Label }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={`Change color of ${label.name}`}
            className={cn(
              "size-6 shrink-0 cursor-pointer shadow-[inset_0_1px_0_oklch(1_0_0/0.35),inset_0_-2px_0_oklch(0_0_0/0.2)]",
              LABEL_COLORS[label.color].dot
            )}
          />
        }
      />
      <PopoverContent className="w-auto" align="start">
        <ColorSwatches
          value={label.color}
          onChange={(color) => {
            setOpen(false)
            void call(api.labels({ id: label.id }).patch({ color }))
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

function LabelRow({ label }: { label: Label }) {
  const [name, setName] = useState(label.name)
  const commit = () => {
    const next = name.trim()
    if (!next || next === label.name) return setName(label.name)
    void call(api.labels({ id: label.id }).patch({ name: next })).then((r) => {
      if (!r) setName(label.name)
    })
  }
  return (
    <li className="flex items-center gap-2">
      <ColorButton label={label} />
      <Input
        value={name}
        aria-label="Label name"
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur()
          if (e.key === "Escape") setName(label.name)
        }}
      />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${label.name}`}
        onClick={() => void call(api.labels({ id: label.id }).delete())}
      >
        <TrashIcon />
      </Button>
    </li>
  )
}

export function LabelsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { labels } = useBoardStore()
  const [name, setName] = useState("")
  const [color, setColor] = useState<LabelColor>("purple")

  const create = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    // Clear immediately; the websocket event can beat the response, and typing may resume.
    const draft = name.trim()
    setName("")
    const created = await call(api.labels.post({ name: draft, color }))
    if (!created) setName((current) => current || draft)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Labels</DialogTitle>
          <DialogDescription>Shared by all boards.</DialogDescription>
        </DialogHeader>

        {labels.length > 0 && (
          <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
            {labels.map((label) => (
              // Keyed by name too, so an external rename resets the local draft.
              <LabelRow key={`${label.id}:${label.name}`} label={label} />
            ))}
          </ul>
        )}

        <form onSubmit={create} className="flex flex-col gap-2 border-t pt-4">
          <div className="flex gap-2">
            <Input
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              placeholder="New Label"
              aria-label="New label name"
            />
            <Button type="submit" disabled={!name.trim()}>
              <PlusIcon data-icon="inline-start" />
              Add
            </Button>
          </div>
          <ColorSwatches value={color} onChange={setColor} />
        </form>
      </DialogContent>
    </Dialog>
  )
}
