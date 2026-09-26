import { PlusIcon, XIcon } from "@phosphor-icons/react"
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { api, call } from "@/lib/api"

/** Trello-style composer at the bottom of a custom column. Stays open for rapid entry. */
export function AddCardComposer({ columnId }: { columnId: number }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [prompt, setPrompt] = useState("")
  const [showPrompt, setShowPrompt] = useState(false)
  const titleRef = useRef<HTMLTextAreaElement>(null)

  const close = () => {
    setOpen(false)
    setTitle("")
    setPrompt("")
    setShowPrompt(false)
  }

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!title.trim()) return
    // Clear immediately so rapid entry isn't clobbered by a late response.
    const draft = { title: title.trim(), prompt }
    setTitle("")
    setPrompt("")
    titleRef.current?.focus()
    const card = await call(api.columns({ id: columnId }).cards.post(draft))
    if (!card) {
      setTitle((current) => current || draft.title)
      setPrompt((current) => current || draft.prompt)
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") close()
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      event.currentTarget === titleRef.current
    ) {
      event.preventDefault()
      void submit()
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      void submit()
    }
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start border border-dashed border-transparent hover:border-foreground/20"
        onClick={() => setOpen(true)}
      >
        <PlusIcon data-icon="inline-start" />
        Add Card
      </Button>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Textarea
        ref={titleRef}
        autoFocus
        rows={2}
        value={title}
        maxLength={200}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Card Title"
        aria-label="Card title"
        className="min-h-0 resize-none bg-card"
      />
      {showPrompt ? (
        <Textarea
          rows={5}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Agent Prompt (⌘↵)"
          aria-label="Prompt"
          className="bg-card font-mono text-base leading-relaxed md:text-sm"
        />
      ) : null}
      <div className="flex items-center gap-1">
        <Button type="submit" size="sm" disabled={!title.trim()}>
          Add
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Cancel"
          onClick={close}
        >
          <XIcon />
        </Button>
        {!showPrompt && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="ml-auto text-muted-foreground"
            onClick={() => setShowPrompt(true)}
          >
            + Prompt
          </Button>
        )}
      </div>
    </form>
  )
}
