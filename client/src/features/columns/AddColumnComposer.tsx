import { PlusIcon, XIcon } from "@phosphor-icons/react"
import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, call } from "@/lib/api"

export function AddColumnComposer({ repoId }: { repoId: number }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    const draft = name.trim()
    setName("")
    const column = await call(
      api.repos({ id: repoId }).columns.post({ name: draft })
    )
    if (!column) setName((current) => current || draft)
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        className="w-72 shrink-0 justify-start border-dashed text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <PlusIcon data-icon="inline-start" />
        Add column
      </Button>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="flex w-72 shrink-0 flex-col gap-2 self-start border bg-muted/40 p-2"
    >
      <Input
        autoFocus
        value={name}
        maxLength={80}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder="Column name…"
        aria-label="Column name"
        className="bg-card"
      />
      <div className="flex items-center gap-1">
        <Button type="submit" size="sm" disabled={!name.trim()}>
          Add column
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Cancel"
          onClick={() => {
            setOpen(false)
            setName("")
          }}
        >
          <XIcon />
        </Button>
      </div>
    </form>
  )
}
