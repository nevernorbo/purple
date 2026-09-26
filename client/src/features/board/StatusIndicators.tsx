import { cn } from "@/lib/utils"

export function StatusIndicators({
  running,
  connected,
  className,
}: {
  running: number
  connected: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 hud-caps text-sm font-semibold",
        className
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1.5 tabular-nums",
          running > 0 ? "text-primary" : "text-muted-foreground"
        )}
        aria-live="polite"
      >
        <span className="relative flex size-2">
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
        {running} Running
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-1.5",
          connected ? "text-success" : "text-warning"
        )}
        title={connected ? "Live Updates" : "Reconnecting"}
      >
        <span
          className={cn(
            "size-2 rotate-45",
            connected ? "bg-success" : "bg-warning"
          )}
        />
        {connected ? "Live" : "Offline"}
      </span>
    </div>
  )
}
