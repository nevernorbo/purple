import { Logo } from "@/features/board/Logo"
import { AddRepoForm } from "./AddRepoForm"

export function EmptyState({ onAdded }: { onAdded: (repoId: number) => void }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="hud-corners relative flex w-full max-w-lg flex-col gap-5 hud-panel p-6">
        <div className="-mx-6 -mt-6 logbook-header px-6 py-4">
          <Logo />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="hud-caps text-2xl leading-none font-bold">
            Register a Repo
          </h2>
          <p className="text-sm text-muted-foreground">
            Point Purple at a local Git checkout to create its board.
          </p>
        </div>
        <AddRepoForm onAdded={(repo) => onAdded(repo.id)} />
      </div>
    </div>
  )
}
