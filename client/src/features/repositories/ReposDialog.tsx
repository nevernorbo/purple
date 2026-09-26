import { TrashIcon } from "@phosphor-icons/react"
import type { Repo } from "purple-server"
import { useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { api, call } from "@/lib/api"
import { useBoardStore } from "@/features/realtime/BoardStore"
import { AddRepoForm } from "./AddRepoForm"

export function ReposDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (repoId: number) => void
}) {
  const { repos, cards } = useBoardStore()
  const [removing, setRemoving] = useState<Repo | null>(null)
  const removingCount = removing
    ? cards.filter((c) => c.repoId === removing.id).length
    : 0

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Repositories</DialogTitle>
            <DialogDescription>
              Each registered repository gets its own board. Agents run in{" "}
              <code>.worktrees/</code> inside it and need <code>origin</code> +
              an authenticated <code>gh</code>.
            </DialogDescription>
          </DialogHeader>

          {repos.length > 0 && (
            <ul className="flex flex-col divide-y border">
              {repos.map((repo) => (
                <li key={repo.id} className="flex items-center gap-3 px-3 py-2">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 flex-col text-left hover:underline"
                    onClick={() => {
                      onSelect(repo.id)
                      onOpenChange(false)
                    }}
                  >
                    <span className="font-medium">{repo.name}</span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {repo.path}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${repo.name}`}
                    onClick={() => setRemoving(repo)}
                  >
                    <TrashIcon />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <AddRepoForm
            onAdded={(repo) => {
              onSelect(repo.id)
              onOpenChange(false)
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes its board, columns and {removingCount} card
              {removingCount === 1 ? "" : "s"} from Purple. The repository on
              disk is not touched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (removing) void call(api.repos({ id: removing.id }).delete())
                setRemoving(null)
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
