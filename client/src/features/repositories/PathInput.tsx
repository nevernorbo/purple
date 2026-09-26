import { Autocomplete } from "@base-ui/react/autocomplete"
import { FolderIcon, GitBranchIcon } from "@phosphor-icons/react"
import { useEffect, useRef, useState, type KeyboardEvent } from "react"

import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

interface PathEntry {
  path: string
  name: string
  isGitRepo: boolean
}

const DEBOUNCE_MS = 80

function commonPrefix(values: string[]) {
  if (values.length === 0) return ""
  let prefix = values[0]!
  for (const value of values) {
    while (!value.toLowerCase().startsWith(prefix.toLowerCase()))
      prefix = prefix.slice(0, -1)
  }
  return prefix
}

/**
 * Directory autocomplete backed by the server's filesystem. Picking an entry fills in
 * `…/dir/`, which immediately lists that directory's children; Tab completes like a shell.
 */
export function PathInput({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  const [entries, setEntries] = useState<PathEntry[]>([])
  const [open, setOpen] = useState(false)
  const highlighted = useRef<PathEntry | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      const { data } = await api.fs.complete.get({ query: { path: value } })
      if (!cancelled && data) setEntries(data)
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [value])

  const complete = (next: string) => {
    if (next.endsWith("/") && next !== value) {
      // Entering a folder: drop its parent's listing until the new one arrives.
      setEntries([])
      highlighted.current = undefined
    }
    onChange(next)
    setOpen(true)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Tab" || event.shiftKey || entries.length === 0) return
    const target =
      highlighted.current ?? (entries.length === 1 ? entries[0] : undefined)
    if (target) {
      event.preventDefault()
      complete(target.path)
      return
    }
    // Several matches: extend to their shared prefix, like a shell. While the list is
    // open, an ambiguous Tab stays in the field (Escape closes the list to tab away).
    const prefix = commonPrefix(entries.map((e) => e.path))
    if (prefix.length > value.length) {
      event.preventDefault()
      complete(prefix)
    } else if (open) {
      event.preventDefault()
    }
  }

  return (
    <Autocomplete.Root
      items={entries}
      // The server already filters; show its results as-is.
      mode="none"
      value={value}
      onValueChange={(next) => complete(next)}
      itemToStringValue={(entry: PathEntry) => entry.path}
      onItemHighlighted={(entry: PathEntry | undefined) => {
        highlighted.current = entry
      }}
      open={open && entries.length > 0}
      onOpenChange={(next, details) => {
        // Picking a folder should keep the list open to show its contents.
        if (!next && details.reason === "item-press") return
        setOpen(next)
      }}
      openOnInputClick
    >
      <Autocomplete.Input
        render={
          <Input
            placeholder="~/code/my-repo"
            aria-label="Repository path"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className={cn("font-mono", className)}
          />
        }
        onKeyDown={onKeyDown}
      />
      <Autocomplete.Portal>
        <Autocomplete.Positioner
          sideOffset={4}
          align="start"
          className="isolate z-50"
        >
          <Autocomplete.Popup className="max-h-[min(20rem,var(--available-height))] w-(--anchor-width) overflow-y-auto bg-popover py-1 text-popover-foreground hud-popup">
            <Autocomplete.List>
              {(entry: PathEntry) => (
                <Autocomplete.Item
                  key={entry.path}
                  value={entry}
                  className="flex cursor-default items-center gap-2 px-2.5 py-2 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  {entry.isGitRepo ? (
                    <GitBranchIcon className="size-3.5 shrink-0 text-primary" />
                  ) : (
                    <FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate font-mono text-xs">
                    {entry.name}/
                  </span>
                  {entry.isGitRepo && (
                    <span className="ml-auto shrink-0 hud-caps text-xs font-bold text-primary">
                      git
                    </span>
                  )}
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  )
}
