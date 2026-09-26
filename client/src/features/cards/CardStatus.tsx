import {
  CheckCircleIcon,
  CircleNotchIcon,
  GitPullRequestIcon,
  XCircleIcon
} from "@phosphor-icons/react"
import type { Card } from "purple-server"

import { duration, useNow } from "@/lib/time"

export function CardStatus({ card }: { card: Card }) {
  const now = useNow(1000, card.status === "running")

  switch (card.status) {
    case "running":
      return (
        <span className="inline-flex items-center gap-1 hud-caps font-semibold text-primary">
          <CircleNotchIcon className="size-3.5 animate-spin" />
          <span className="tabular-nums">
            {duration(now - (card.startedAt ?? now))}
          </span>
        </span>
      )
    case "completed":
      return card.prUrl ? (
        <a
          href={card.prUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 inline-flex items-center gap-1 hud-caps font-semibold text-success hover:underline"
        >
          <GitPullRequestIcon className="size-3.5" />
          PR #{card.prUrl.split("/").pop()}
        </a>
      ) : (
        <span className="inline-flex items-center gap-1 hud-caps font-semibold text-success">
          <CheckCircleIcon className="size-3.5" />
          Done
        </span>
      )
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 hud-caps font-semibold text-destructive">
          <XCircleIcon className="size-3.5" />
          {card.exitCode === null ? "Interrupted" : `Exit ${card.exitCode}`}
        </span>
      )
    default:
      return null
  }
}
