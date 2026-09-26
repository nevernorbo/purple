import {
  AtIcon,
  CodeBlockIcon,
  CodeIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  QuotesIcon,
  TextBIcon,
  TextHOneIcon,
  TextHTwoIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  type Icon,
} from "@phosphor-icons/react"
import { Placeholder } from "@tiptap/extensions"
import { Markdown } from "@tiptap/markdown"
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import type { SuggestionProps } from "@tiptap/suggestion"
import { useEffect, useRef, useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { createFileMention, type FileSuggestionBridge } from "./fileMention"
import {
  FileSuggestions,
  type FileSuggestionsHandle,
  type RepoFile,
} from "./FileSuggestions"

type Mode = "rich" | "plain"

const MODE_KEY = "purple:prompt-mode"
const PLACEHOLDER = "What should the agent do? Type @ to reference a file."

function loadMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === "plain" ? "plain" : "rich"
  } catch {
    return "rich"
  }
}

/** Markdown prompt editor with a rich (WYSIWYG) view and a raw plaintext view. */
export function PromptEditor({
  repoId,
  value,
  onChange,
  readOnly,
  className,
}: {
  repoId: number
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
  className?: string
}) {
  const [mode, setModeState] = useState<Mode>(loadMode)
  const setMode = (next: Mode) => {
    setModeState(next)
    try {
      localStorage.setItem(MODE_KEY, next)
    } catch {
      // Preference just won't stick.
    }
  }

  const toggle = <ModeToggle mode={mode} onChange={setMode} />

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col border border-input bg-background/60 shadow-[inset_0_1px_3px_oklch(0_0_0/0.12)] transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/25 dark:bg-black/25 dark:shadow-[inset_0_1px_4px_oklch(0_0_0/0.4)]",
        className
      )}
    >
      {mode === "rich" ? (
        <RichEditor
          repoId={repoId}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          toggle={toggle}
        />
      ) : (
        <>
          <Toolbar toggle={toggle}>
            <span className="px-1 text-xs text-muted-foreground">
              Markdown source
            </span>
          </Toolbar>
          <Textarea
            aria-label="Prompt"
            value={value}
            readOnly={readOnly}
            onChange={(e) => onChange(e.target.value)}
            placeholder={PLACEHOLDER}
            spellCheck={false}
            className="field-sizing-fixed min-h-0 flex-1 resize-none border-0 bg-transparent font-mono text-base leading-relaxed shadow-none focus-visible:ring-0 md:text-sm dark:bg-transparent dark:shadow-none"
          />
        </>
      )}
    </div>
  )
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode
  onChange: (mode: Mode) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Prompt view"
      className="flex border bg-background/40"
    >
      {(["rich", "plain"] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          onClick={() => onChange(m)}
          className={cn(
            "h-6 px-2.5 hud-caps text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground",
            mode === m &&
              "bg-primary/15 text-foreground shadow-[inset_0_-2px_0_var(--primary)]"
          )}
        >
          {m === "rich" ? "Rich" : "Plain"}
        </button>
      ))}
    </div>
  )
}

function Toolbar({
  children,
  toggle,
}: {
  children?: ReactNode
  toggle: ReactNode
}) {
  return (
    <div className="flex min-h-9 shrink-0 items-center gap-1 border-b bg-panel-header/40 px-1.5 py-1">
      <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
        {children}
      </div>
      {toggle}
    </div>
  )
}

function RichEditor({
  repoId,
  value,
  onChange,
  readOnly,
  toggle,
}: {
  repoId: number
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
  toggle: ReactNode
}) {
  const [suggestion, setSuggestion] = useState<SuggestionProps | null>(null)
  const listRef = useRef<FileSuggestionsHandle>(null)
  // The extension is built once; its callbacks only touch stable setters and refs.
  const [bridge] = useState<FileSuggestionBridge>(() => ({
    onChange: setSuggestion,
    onKeyDown: ({ event }) => listRef.current?.onKeyDown(event) ?? false,
  }))

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // No markdown syntax for underline; keep the prompt round-trippable.
        underline: false,
        link: { openOnClick: false, autolink: true },
      }),
      Markdown,
      Placeholder.configure({ placeholder: PLACEHOLDER }),
      createFileMention(bridge),
    ],
    content: value,
    contentType: "markdown",
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: "prompt-prose px-4 pt-3 pb-6 outline-none",
        "aria-label": "Prompt",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getMarkdown().trimEnd()),
  })

  useEffect(() => {
    editor.setEditable(!readOnly)
  }, [editor, readOnly])

  const insertFile = (file: RepoFile) => suggestion?.command({ id: file.path })

  const drillInto = (file: RepoFile) => {
    if (!suggestion) return
    editor
      .chain()
      .focus()
      .insertContentAt(suggestion.range, `@${file.path}`)
      .run()
  }

  return (
    <>
      <Toolbar toggle={toggle}>
        {!readOnly && <FormatButtons editor={editor} />}
      </Toolbar>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          className="min-h-0 flex-1 cursor-text overflow-y-auto"
          // Clicks in the blank space below the text continue at the end of the document.
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).closest(".ProseMirror")) return
            e.preventDefault()
            editor.chain().focus("end").run()
          }}
        >
          <EditorContent editor={editor} />
        </div>
        {suggestion && (
          <FileSuggestions
            ref={listRef}
            repoId={repoId}
            query={suggestion.query}
            clientRect={suggestion.clientRect}
            onSelect={insertFile}
            onDrill={drillInto}
          />
        )}
      </div>
    </>
  )
}

interface FormatAction {
  label: string
  icon: Icon
  isActive: (editor: Editor) => boolean
  run: (editor: Editor) => void
}

const FORMAT_GROUPS: FormatAction[][] = [
  [
    {
      label: "Heading 1",
      icon: TextHOneIcon,
      isActive: (e) => e.isActive("heading", { level: 1 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: "Heading 2",
      icon: TextHTwoIcon,
      isActive: (e) => e.isActive("heading", { level: 2 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    },
  ],
  [
    {
      label: "Bold",
      icon: TextBIcon,
      isActive: (e) => e.isActive("bold"),
      run: (e) => e.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      icon: TextItalicIcon,
      isActive: (e) => e.isActive("italic"),
      run: (e) => e.chain().focus().toggleItalic().run(),
    },
    {
      label: "Strikethrough",
      icon: TextStrikethroughIcon,
      isActive: (e) => e.isActive("strike"),
      run: (e) => e.chain().focus().toggleStrike().run(),
    },
    {
      label: "Inline code",
      icon: CodeIcon,
      isActive: (e) => e.isActive("code"),
      run: (e) => e.chain().focus().toggleCode().run(),
    },
  ],
  [
    {
      label: "Bullet list",
      icon: ListBulletsIcon,
      isActive: (e) => e.isActive("bulletList"),
      run: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Numbered list",
      icon: ListNumbersIcon,
      isActive: (e) => e.isActive("orderedList"),
      run: (e) => e.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Quote",
      icon: QuotesIcon,
      isActive: (e) => e.isActive("blockquote"),
      run: (e) => e.chain().focus().toggleBlockquote().run(),
    },
    {
      label: "Code block",
      icon: CodeBlockIcon,
      isActive: (e) => e.isActive("codeBlock"),
      run: (e) => e.chain().focus().toggleCodeBlock().run(),
    },
  ],
  [
    {
      label: "Reference a file",
      icon: AtIcon,
      isActive: () => false,
      run: (e) => {
        // Pad with a space so the @ trigger sees a word boundary.
        const { $from } = e.state.selection
        const before = $from.parent.textBetween(0, $from.parentOffset)
        e.chain()
          .focus()
          .insertContent(before === "" || /\s$/.test(before) ? "@" : " @")
          .run()
      },
    },
  ],
]

function FormatButtons({ editor }: { editor: Editor }) {
  const active = useEditorState({
    editor,
    selector: ({ editor }) =>
      FORMAT_GROUPS.flat().map((action) => action.isActive(editor)),
  })

  let index = 0
  return FORMAT_GROUPS.map((group, g) => (
    <div
      key={g}
      className="flex items-center gap-0.5 not-first:ml-1 not-first:border-l not-first:pl-1"
    >
      {group.map((action) => {
        const pressed = active[index++]
        const ActionIcon = action.icon
        return (
          <Button
            key={action.label}
            type="button"
            variant="ghost"
            size="icon-xs"
            title={action.label}
            aria-label={action.label}
            aria-pressed={pressed}
            // Keep the editor's selection while clicking.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => action.run(editor)}
            className={cn(pressed && "bg-primary/15 text-foreground")}
          >
            <ActionIcon />
          </Button>
        )
      })}
    </div>
  ))
}
