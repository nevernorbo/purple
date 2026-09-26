import { PlusIcon, TagIcon } from "@phosphor-icons/react"
import type { Card, Label } from "purple-server"
import { useState, type FormEvent, type KeyboardEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { api, call } from "@/lib/api"
import { useBoardStore } from "@/features/realtime/BoardStore"
import { LabelChip } from "@/features/labels/LabelChip"
import { LabelPicker } from "@/features/labels/LabelPicker"
import { CardStatus } from "./CardStatus"
import { PromptEditor } from "./prompt/PromptEditor"

export function CardDialog({
  card,
  onClose,
}: {
  card: Card | null
  onClose: () => void
}) {
  return (
    <Dialog open={card !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex flex-col max-sm:inset-0 max-sm:h-svh max-sm:max-w-none max-sm:translate-0 max-sm:overflow-y-auto sm:h-[min(52rem,calc(100svh-4rem))] sm:max-w-4xl">
        {/* Remount per card so the form starts from that card's values. */}
        {card && <CardForm key={card.id} card={card} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function CardForm({ card, onClose }: { card: Card; onClose: () => void }) {
  const { labels } = useBoardStore()
  const [title, setTitle] = useState(card.title)
  const [prompt, setPrompt] = useState(card.prompt)
  const [labelIds, setLabelIds] = useState(card.labelIds)
  const [pending, setPending] = useState(false)
  const locked = card.status === "running"

  const save = async (event?: FormEvent) => {
    event?.preventDefault()
    if (locked || pending || !title.trim()) return
    setPending(true)
    const saved = await call(
      api
        .cards({ id: card.id })
        .patch({ title: title.trim(), prompt, labelIds })
    )
    setPending(false)
    if (saved) onClose()
  }

  // Capture phase, so the editor's own Mod-Enter (hard break) never sees it.
  const onKeyDownCapture = (event: KeyboardEvent) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      event.stopPropagation()
      void save()
    }
  }

  return (
    <form
      onSubmit={save}
      onKeyDownCapture={onKeyDownCapture}
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <DialogHeader className="gap-2.5 pb-3">
        <DialogTitle className="sr-only">
          {locked ? "Running Card" : "Edit Card"}
        </DialogTitle>
        <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="hud-caps font-semibold tabular-nums">
            #{card.id}
          </span>
          <CardStatus card={card} />
          {card.branch && (
            <span className="min-w-0 truncate font-mono">{card.branch}</span>
          )}
          {card.status === "failed" && (
            <span className="font-mono">data/logs/{card.id}.log</span>
          )}
        </DialogDescription>
        <input
          aria-label="Title"
          value={title}
          maxLength={200}
          readOnly={locked}
          required
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Card title"
          className="-mx-1.5 w-[calc(100%+0.75rem)] border border-transparent bg-transparent px-1.5 py-0.5 text-2xl leading-tight outline-none placeholder:text-muted-foreground/60 hover:border-input read-only:hover:border-transparent focus-visible:border-primary focus-visible:bg-background/50"
        />
        <CardLabels
          labels={labels}
          selected={labelIds}
          onChange={setLabelIds}
          readOnly={locked}
        />
      </DialogHeader>

      <PromptEditor
        repoId={card.repoId}
        value={prompt}
        onChange={setPrompt}
        readOnly={locked}
        className="min-h-72 flex-1"
      />

      <DialogFooter className="sm:items-center sm:justify-between">
        <p className="hidden text-xs text-muted-foreground sm:block">
          {locked ? (
            "Read-only while the agent is running"
          ) : (
            <>
              <Kbd>@</Kbd> reference a file · <Kbd>⌘↵</Kbd> save
            </>
          )}
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onClose}>
            {locked ? "Close" : "Cancel"}
          </Button>
          {!locked && (
            <Button type="submit" disabled={pending || !title.trim()}>
              Save
            </Button>
          )}
        </div>
      </DialogFooter>
    </form>
  )
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="border bg-background/50 px-1 py-px font-mono text-[11px] text-foreground">
      {children}
    </kbd>
  )
}

function CardLabels({
  labels,
  selected,
  onChange,
  readOnly,
}: {
  labels: Label[]
  selected: number[]
  onChange: (ids: number[]) => void
  readOnly: boolean
}) {
  const chosen = labels.filter((l) => selected.includes(l.id))

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chosen.map((label) => (
        <LabelChip key={label.id} label={label} />
      ))}
      {!readOnly && (
        <Popover>
          <PopoverTrigger
            render={
              <Button type="button" variant="ghost" size="xs">
                {chosen.length ? (
                  <PlusIcon data-icon="inline-start" />
                ) : (
                  <TagIcon data-icon="inline-start" />
                )}
                {chosen.length ? "Edit" : "Add Labels"}
              </Button>
            }
          />
          <PopoverContent
            align="start"
            className="max-h-72 w-60 gap-0 overflow-y-auto p-1"
          >
            <LabelPicker
              labels={labels}
              selected={selected}
              onChange={onChange}
              empty="No Labels"
            />
          </PopoverContent>
        </Popover>
      )}
      {readOnly && chosen.length === 0 && (
        <span className="text-xs text-muted-foreground">No labels</span>
      )}
    </div>
  )
}
