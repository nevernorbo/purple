import type { Card } from "purple-server"
import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { api, call } from "@/lib/api"
import { useBoardStore } from "@/features/realtime/BoardStore"
import { LabelPicker } from "@/features/labels/LabelPicker"
import { CardStatus } from "./CardStatus"

export function CardDialog({
  card,
  onClose,
}: {
  card: Card | null
  onClose: () => void
}) {
  return (
    <Dialog open={card !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-sm:inset-0 max-sm:flex max-sm:h-svh max-sm:max-w-none max-sm:translate-0 max-sm:flex-col max-sm:overflow-y-auto sm:max-w-2xl">
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

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    setPending(true)
    const saved = await call(
      api
        .cards({ id: card.id })
        .patch({ title: title.trim(), prompt, labelIds })
    )
    setPending(false)
    if (saved) onClose()
  }

  return (
    <form onSubmit={save} className="flex min-h-0 flex-1 flex-col gap-5">
      <DialogHeader>
        <DialogTitle>{locked ? "Running" : "Edit Card"}</DialogTitle>
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
      </DialogHeader>

      <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="card-title">Title</Label>
            <Input
              id="card-title"
              value={title}
              maxLength={200}
              disabled={locked}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="card-prompt">Prompt</Label>
            <Textarea
              id="card-prompt"
              value={prompt}
              disabled={locked}
              onChange={(e) => setPrompt(e.target.value)}
              rows={14}
              placeholder="What should the agent do?"
              className="max-h-[50vh] min-h-48 font-mono text-base leading-relaxed md:text-sm"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Labels</Label>
          <div className="max-h-48 overflow-y-auto border bg-background/40 sm:max-h-72 dark:bg-black/20">
            <LabelPicker
              labels={labels}
              selected={labelIds}
              onChange={locked ? () => {} : setLabelIds}
              empty="No Labels"
            />
          </div>
        </div>
      </div>

      <DialogFooter className="mt-auto">
        <Button type="button" variant="outline" onClick={onClose}>
          {locked ? "Close" : "Cancel"}
        </Button>
        {!locked && (
          <Button type="submit" disabled={pending || !title.trim()}>
            Save
          </Button>
        )}
      </DialogFooter>
    </form>
  )
}
