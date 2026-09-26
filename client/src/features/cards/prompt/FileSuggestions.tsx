import { flip, offset, shift, size, useFloating } from "@floating-ui/react-dom"
import { FileIcon, FolderIcon } from "@phosphor-icons/react"
import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
} from "react"

import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

export interface RepoFile {
  path: string
  isDir: boolean
}

export interface FileSuggestionsHandle {
  /** Returns true when the key was consumed by the list. */
  onKeyDown: (event: KeyboardEvent) => boolean
}

const DEBOUNCE_MS = 60

function splitPath(path: string) {
  const trimmed = path.endsWith("/") ? path.slice(0, -1) : path
  const slash = trimmed.lastIndexOf("/")
  return {
    name: trimmed.slice(slash + 1) + (path.endsWith("/") ? "/" : ""),
    dir: slash === -1 ? "" : trimmed.slice(0, slash + 1),
  }
}

/**
 * Popup listing repo files for an `@` query, anchored at the caret. Rendered inline
 * (not portalled) so the surrounding dialog doesn't treat clicks on it as outside presses.
 */
export function FileSuggestions({
  ref,
  repoId,
  query,
  clientRect,
  onSelect,
  onDrill,
}: {
  ref: Ref<FileSuggestionsHandle>
  repoId: number
  query: string
  clientRect: (() => DOMRect | null) | null | undefined
  onSelect: (file: RepoFile) => void
  /** Tab on a folder: narrow the query to its contents instead of inserting it. */
  onDrill: (file: RepoFile) => void
}) {
  const [files, setFiles] = useState<RepoFile[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const {
    refs: { setReference, setFloating },
    floatingStyles,
  } = useFloating({
    placement: "bottom-start",
    strategy: "absolute",
    middleware: [
      offset(6),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ availableHeight, elements }) {
          elements.floating.style.maxHeight = `${Math.min(288, availableHeight)}px`
        },
      }),
    ],
  })

  useLayoutEffect(() => {
    setReference({
      getBoundingClientRect: () => clientRect?.() ?? new DOMRect(),
    })
  }, [clientRect, setReference])

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      const { data } = await api
        .repos({ id: repoId })
        .files.get({ query: { q: query } })
      if (cancelled) return
      setFiles(data ?? [])
      setActive(0)
      setLoading(false)
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [repoId, query])

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" })
  }, [active])

  useImperativeHandle(ref, () => ({
    onKeyDown(event) {
      if (event.key === "Escape") {
        // Keep the dialog open; the suggestion plugin closes the popup.
        event.stopPropagation()
        return true
      }
      if (files.length === 0) return false
      const current = files[active]
      switch (event.key) {
        case "ArrowDown":
          setActive((i) => (i + 1) % files.length)
          return true
        case "ArrowUp":
          setActive((i) => (i - 1 + files.length) % files.length)
          return true
        case "Enter":
          if (current) onSelect(current)
          return true
        case "Tab":
          if (current?.isDir && !event.shiftKey) onDrill(current)
          else if (current) onSelect(current)
          return true
        default:
          return false
      }
    },
  }))

  return (
    <div
      ref={setFloating}
      style={floatingStyles}
      className="z-50 flex w-[min(28rem,calc(100vw-2rem))] flex-col bg-popover text-popover-foreground hud-popup"
      // Keep focus (and the caret) in the editor while clicking items.
      onMouseDown={(e) => e.preventDefault()}
    >
      <div
        ref={listRef}
        role="listbox"
        className="min-h-0 flex-1 overflow-y-auto py-1"
      >
        {files.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">
            {loading ? "Searching…" : "No matching files"}
          </p>
        ) : (
          files.map((file, index) => {
            const { name, dir } = splitPath(file.path)
            return (
              <button
                key={file.path}
                type="button"
                role="option"
                data-index={index}
                aria-selected={index === active}
                onMouseMove={() => setActive(index)}
                onClick={() => onSelect(file)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left outline-none",
                  index === active && "bg-accent text-accent-foreground"
                )}
              >
                {file.isDir ? (
                  <FolderIcon className="size-3.5 shrink-0 text-primary" />
                ) : (
                  <FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="shrink-0 font-mono text-xs">{name}</span>
                <span
                  className="min-w-0 truncate font-mono text-xs text-muted-foreground"
                  dir="rtl"
                >
                  {/* rtl truncates the start of long paths, keeping the nearest folders visible. */}
                  <bdi>{dir}</bdi>
                </span>
              </button>
            )
          })
        )}
      </div>
      <div className="flex gap-3 border-t px-3 py-1.5 text-[11px] text-muted-foreground">
        <span>↑↓ navigate</span>
        <span>↵ insert</span>
        <span>⇥ open folder</span>
        <span>esc close</span>
      </div>
    </div>
  )
}
