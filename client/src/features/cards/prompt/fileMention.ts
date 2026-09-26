import Mention from "@tiptap/extension-mention"
import type {
  SuggestionKeyDownProps,
  SuggestionProps,
} from "@tiptap/suggestion"

/** Characters allowed in an unquoted `@path`; anything else ends the reference. */
const BARE_PATH = /^@([\w.\-~/+]*[\w\-~/+])/
/** `@"path with spaces"`, the form Claude Code uses for paths it can't write bare. */
const QUOTED_PATH = /^@"([^"\n]+)"/

export function formatFileRef(path: string) {
  return /\s/.test(path) ? `@"${path}"` : `@${path}`
}

export interface FileSuggestionBridge {
  onChange: (props: SuggestionProps | null) => void
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

/**
 * A file reference chip, typed with `@`. Serializes to markdown as a plain `@path` so
 * the agent sees the same syntax as a prompt written in Claude Code.
 */
export function createFileMention(bridge: FileSuggestionBridge) {
  return Mention.extend({
    name: "fileMention",

    markdownTokenizer: {
      name: "fileMention",
      level: "inline",
      start(src: string) {
        // Only treat @ as a reference at a word start, so emails stay text.
        const match = /(^|[\s([{])@["\w.~/]/.exec(src)
        return match ? match.index + match[1]!.length : -1
      },
      tokenize(src, tokens) {
        if (/\w$/.test(tokens.at(-1)?.raw ?? "")) return undefined
        const match = QUOTED_PATH.exec(src) ?? BARE_PATH.exec(src)
        if (!match) return undefined
        return { type: "fileMention", raw: match[0], path: match[1] }
      },
    },
    parseMarkdown(token, helpers) {
      return helpers.createNode("fileMention", {
        id: token.path,
        label: token.path,
      })
    },
    renderMarkdown(node) {
      return formatFileRef(node.attrs?.id ?? "")
    },
  }).configure({
    HTMLAttributes: { class: "file-mention" },
    renderText: ({ node }) => formatFileRef(node.attrs.id ?? ""),
    renderHTML: ({ node, options }) => [
      "span",
      { ...options.HTMLAttributes, title: node.attrs.id },
      `@${node.attrs.id ?? ""}`,
    ],
    deleteTriggerWithBackspace: true,
    suggestion: {
      char: "@",
      allowedPrefixes: [" ", "(", "[", "{"],
      // Results are fetched by the React popup so it can debounce and drop stale replies.
      items: () => [],
      command: ({ editor, range, props }) => {
        const { id } = props as { id: string }
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            { type: "fileMention", attrs: { id, label: id } },
            { type: "text", text: " " },
          ])
          .run()
      },
      render: () => ({
        onStart: (props) => bridge.onChange(props),
        onUpdate: (props) => bridge.onChange(props),
        onExit: () => bridge.onChange(null),
        onKeyDown: (props) => bridge.onKeyDown(props),
      }),
    },
  })
}
