import { PlusIcon, XIcon } from "@phosphor-icons/react"
import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, call } from "@/lib/api"
import { cn } from "@/lib/utils"

export function AddColumnComposer({
  repoId,
  className,
}: {
  repoId: number
  className?: string
}) {
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
        variant="ghost"
        className={cn(
          "h-14 w-80 shrink-0 justify-start border border-dashed border-foreground/25 bg-panel/40 hover:border-primary/60 hover:bg-primary/8 hover:text-foreground",
          className
        )}
        onClick={() => setOpen(true)}
      >
        <PlusIcon data-icon="inline-start" />
        Add Column
      </Button>
    )
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        "hud-corners relative flex w-80 shrink-0 flex-col gap-3 self-start hud-panel p-3",
        className
      )}
    >
      <Input
        autoFocus
        value={name}
        maxLength={80}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder="Column Name"
        aria-label="Column name"
      />
      <div className="flex items-center gap-1">
        <Button type="submit" size="sm" disabled={!name.trim()}>
          Add
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
