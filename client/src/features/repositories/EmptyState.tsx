import { Logo } from "@/features/board/Logo"
import { AddRepoForm } from "./AddRepoForm"

export function EmptyState({ onAdded }: { onAdded: (repoId: number) => void }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-lg flex-col gap-4 border bg-card p-6">
        <Logo />
        <div className="flex flex-col gap-1">
          <h1 className="text-sm font-medium">
            Register your first repository
          </h1>
          <p className="text-xs text-muted-foreground">
            Point Purple at a local Git checkout. It gets a board with Running,
            Completed and Failed columns; add your own columns to organize cards
            before starting them.
          </p>
        </div>
        <AddRepoForm onAdded={(repo) => onAdded(repo.id)} />
      </div>
    </div>
  )
}
