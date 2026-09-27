import { cn } from "@/lib/utils"

/* Wordmark: void-to-pink gradient caps with a hard offset shadow, and a blinking
   block cursor for the headless agents. Collapsed, it shrinks to the "P". */
export function Logo({ className }: { className?: string }) {
  return (
    <div
      aria-label="Purple"
      className={cn("flex items-end gap-1 select-none", className)}
    >
      <span
        aria-hidden
        className="font-heading text-2xl leading-none font-bold tracking-[0.14em] uppercase drop-shadow-[1.5px_1.5px_0_color-mix(in_oklch,var(--primary),white_40%)] group-data-[collapsible=icon]:tracking-normal dark:text-slate-700"
      >
        P<span className="group-data-[collapsible=icon]:hidden">urple</span>
      </span>
    </div>
  )
}
