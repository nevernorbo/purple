import {
  ClockCounterClockwiseIcon,
  PencilSimpleIcon,
  PlusIcon,
  TagIcon,
} from "@phosphor-icons/react"
import type { Card, CardRevision, Label } from "purple-server"
import {
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from "react"

import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
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
import { cardActions } from "./actions"
import { CardStatus } from "./CardStatus"
import { RevisionHistory } from "./history/RevisionHistory"
import { PrSummary } from "./PrSummary"
import { PromptEditor } from "./prompt/PromptEditor"

interface CardFormHandle {
  /** Persists pending edits; called when the dialog closes. */
  flush: () => void
}

export function CardDialog({
  card,
  onClose,
}: {
  card: Card | null
  onClose: () => void
}) {
  const formRef = useRef<CardFormHandle>(null)
  const close = () => {
    formRef.current?.flush()
    onClose()
  }

  return (
    <Dialog open={card !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="flex flex-col max-sm:inset-0 max-sm:h-svh max-sm:max-w-none max-sm:translate-0 max-sm:overflow-y-auto sm:h-[min(52rem,calc(100svh-4rem))] sm:max-w-4xl">
        {/* Remount per card so the form starts from that card's values. */}
        {card && <CardForm key={card.id} ref={formRef} card={card} />}
      </DialogContent>
    </Dialog>
  )
}

interface Draft {
  title: string
  prompt: string
  labelIds: number[]
}

const sameLabels = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join()

function CardForm({ ref, card }: { ref: Ref<CardFormHandle>; card: Card }) {
  const { labels } = useBoardStore()
  const [title, setTitle] = useState(card.title)
  const [prompt, setPrompt] = useState(card.prompt)
  const [labelIds, setLabelIds] = useState(card.labelIds)
  /** What the server has; edits are diffed against it to decide whether to save. */
  const [saved, setSaved] = useState<Draft>(() => ({
    title: card.title,
    prompt: card.prompt,
    labelIds: card.labelIds,
  }))
  const [saving, setSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  /** Bumped after each save so the history list refetches. */
  const [revision, setRevision] = useState(0)
  /** Bumped to remount the editor when its content is replaced (restore). */
  const [editorKey, setEditorKey] = useState(0)
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const locked = card.status === "running"

  const dirty =
    title.trim() !== saved.title ||
    prompt !== saved.prompt ||
    !sameLabels(labelIds, saved.labelIds)

  /** Saves the current edits, serialized behind any save already in flight. */
  const save = () => {
    if (locked || !dirty) return queue.current
    // A blank title can't be saved; keep the last one rather than dropping the prompt.
    const draft = { title: title.trim() || saved.title, prompt, labelIds }
    const run = async () => {
      setSaving(true)
      const result = await call(api.cards({ id: card.id }).patch(draft))
      setSaving(false)
      if (!result) return
      setSaved(draft)
      setRevision((r) => r + 1)
    }
    queue.current = queue.current.then(run)
    return queue.current
  }

  useImperativeHandle(ref, () => ({ flush: () => void save() }))

  const onKeyDownCapture = (event: KeyboardEvent) => {
    if (event.key.toLowerCase() === "s" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      event.stopPropagation()
      void save()
    }
  }

  const toggleHistory = async () => {
    // Commit pending edits first so they show up as the newest revision.
    if (!showHistory) await save()
    setShowHistory((open) => !open)
  }

  const restore = async (target: CardRevision) => {
    await save()
    const result = await call(
      api
        .cards({ id: card.id })
        .revisions({ revisionId: target.id })
        .restore.post()
    )
    if (!result) return
    setTitle(result.title)
    setPrompt(result.prompt)
    setSaved({ title: result.title, prompt: result.prompt, labelIds })
    setEditorKey((k) => k + 1)
    setRevision((r) => r + 1)
    setShowHistory(false)
  }

  return (
    <div
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

      {/* Hidden in history so the diff gets the room. */}
      {card.prUrl && !locked && !showHistory && (
        <PrSummary
          summary={card.prSummary}
          onRefresh={() => cardActions.refreshPrSummary(card.id)}
        />
      )}

      {showHistory ? (
        <RevisionHistory
          cardId={card.id}
          refreshKey={revision}
          readOnly={locked}
          onRestore={restore}
        />
      ) : (
        <PromptEditor
          key={editorKey}
          repoId={card.repoId}
          value={prompt}
          onChange={setPrompt}
          readOnly={locked}
          className="min-h-72 flex-1"
        />
      )}

      <DialogFooter className="flex-row items-center justify-between sm:justify-between">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {locked ? (
            "Read-only while the agent is running"
          ) : saving ? (
            "Saving…"
          ) : dirty ? (
            <>
              <span className="text-warning">Unsaved changes</span>
              <span className="max-sm:hidden">
                {" "}
                · <Kbd className="text-[11px] text-foreground">⌘S</Kbd> or close
                to save
              </span>
            </>
          ) : (
            <>
              All changes saved
              <span className="max-sm:hidden">
                {" "}
                · <Kbd className="text-[11px] text-foreground">@</Kbd> reference
                a file
              </span>
            </>
          )}
        </p>
        <Button
          type="button"
          variant={showHistory ? "secondary" : "outline"}
          size="sm"
          onClick={toggleHistory}
          disabled={saving}
        >
          {showHistory ? (
            <PencilSimpleIcon data-icon="inline-start" />
          ) : (
            <ClockCounterClockwiseIcon data-icon="inline-start" />
          )}
          {showHistory ? "Editor" : "History"}
        </Button>
      </DialogFooter>
    </div>
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
