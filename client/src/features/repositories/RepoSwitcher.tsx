import { GitBranchIcon } from "@phosphor-icons/react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useBoardStore } from "@/features/realtime/BoardStore"

export function RepoSwitcher({
  repoId,
  onChange,
}: {
  repoId: number | null
  onChange: (repoId: number) => void
}) {
  const { repos } = useBoardStore()
  const items = repos.map((r) => ({ value: r.id, label: r.name }))

  return (
    <Select
      items={items}
      value={repoId}
      onValueChange={(value) => value !== null && onChange(value)}
    >
      <SelectTrigger size="sm" className="min-w-40" aria-label="Board">
        <GitBranchIcon />
        <SelectValue placeholder="Select a board" />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align="start">
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
