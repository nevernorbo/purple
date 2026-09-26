import { cn } from "@/lib/utils"

export function StatusIndicators({
  running,
  connected,
}: {
  running: number
  connected: boolean
}) {
  return (
    <div className="flex items-center gap-3 text-xs">
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
              "relative inline-flex size-2",
              running > 0 ? "bg-primary" : "bg-muted-foreground/40"
            )}
          />
        </span>
        {running} running
      </span>
      <span
        className="inline-flex items-center gap-1.5 text-muted-foreground"
        title={connected ? "Live updates connected" : "Reconnecting…"}
      >
        <span
          className={cn(
            "size-2 rounded-full",
            connected ? "bg-green-500" : "bg-amber-500"
          )}
        />
        <span className="hidden sm:inline">
          {connected ? "live" : "offline"}
        </span>
      </span>
    </div>
  )
}
