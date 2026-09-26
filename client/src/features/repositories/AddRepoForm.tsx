import { FolderPlusIcon } from "@phosphor-icons/react"
import type { Repo } from "purple-server"
import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, call } from "@/lib/api"

export function AddRepoForm({ onAdded }: { onAdded?: (repo: Repo) => void }) {
  const [path, setPath] = useState("")
  const [pending, setPending] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!path.trim()) return
    setPending(true)
    const repo = await call(api.repos.post({ path: path.trim() }))
    setPending(false)
    if (repo) {
      setPath("")
      onAdded?.(repo)
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="/absolute/path/to/repository"
        aria-label="Repository path"
        spellCheck={false}
        className="font-mono"
      />
      <Button type="submit" disabled={!path.trim() || pending}>
        <FolderPlusIcon data-icon="inline-start" />
        Register
      </Button>
    </form>
  )
}
