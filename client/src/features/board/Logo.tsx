import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 select-none", className)}>
      <span aria-hidden className="flex h-5 shrink-0 items-start gap-0.5">
        <span className="h-5 w-1.5 bg-primary shadow-[0_0_10px_-1px_var(--glow)]" />
        <span className="h-3 w-1.5 bg-primary/55" />
      </span>
      <span className="hud-caps text-2xl leading-none font-bold tracking-[0.12em] group-data-[collapsible=icon]:hidden">
        purple
      </span>
    </div>
  )
}
