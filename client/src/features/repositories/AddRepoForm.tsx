import { FolderPlusIcon } from "@phosphor-icons/react"
import type { Repo } from "purple-server"
import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { api, call } from "@/lib/api"
import { PathInput } from "./PathInput"

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
      <div className="min-w-0 flex-1">
        <PathInput value={path} onChange={setPath} />
      </div>
      <Button type="submit" disabled={!path.trim() || pending}>
        <FolderPlusIcon data-icon="inline-start" />
        Register
      </Button>
    </form>
  )
}
