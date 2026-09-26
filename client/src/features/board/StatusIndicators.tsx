import { cn } from "@/lib/utils"

export function StatusIndicators({
  running,
  connected,
  compact = false,
  className,
}: {
  running: number
  connected: boolean
  compact?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-3 hud-caps text-sm font-semibold whitespace-nowrap",
        compact && "w-8 flex-col gap-2",
        className
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1.5 tabular-nums",
          running > 0 ? "text-primary" : "text-muted-foreground"
        )}
        aria-live="polite"
        aria-label={`${running} running agents`}
        title={`${running} running agents`}
      >
        {!compact && (
          <span aria-hidden className="relative flex size-2 shrink-0">
            {running > 0 && (
              <span className="absolute inline-flex size-full animate-ping bg-primary opacity-60" />
            )}
            <span
              className={cn(
                "relative inline-flex size-2 rotate-45",
                running > 0 ? "bg-primary" : "bg-muted-foreground/40"
              )}
            />
          </span>
        )}
        <span className={compact ? "text-xl leading-7" : undefined}>
          {running}
        </span>
        {!compact && " Running"}
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-1.5",
          connected ? "text-success" : "text-warning"
        )}
        title={connected ? "Live Updates" : "Reconnecting"}
        role="status"
        aria-label={connected ? "Live Updates" : "Offline: Reconnecting"}
      >
        <span
          className={cn(
            "size-2 shrink-0 rotate-45",
            connected ? "bg-success" : "bg-warning"
          )}
        />
        <span className={compact ? "sr-only" : undefined}>
          {connected ? "Live" : "Offline"}
        </span>
      </span>
    </div>
  )
}
