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
        className="bg-linear-to-r from-primary via-primary to-rarity-pink bg-clip-text font-heading text-2xl leading-none font-bold tracking-[0.14em] text-transparent uppercase drop-shadow-[1.5px_1.5px_0_color-mix(in_oklch,var(--primary),black_55%)] group-data-[collapsible=icon]:tracking-normal"
      >
        P<span className="group-data-[collapsible=icon]:hidden">urple</span>
      </span>
      <span
        aria-hidden
        className="mb-0.5 h-1 w-2.5 bg-rarity-pink shadow-[0_0_8px_var(--rarity-pink)] group-data-[collapsible=icon]:hidden motion-safe:animate-[logo-blink_1.1s_steps(1)_infinite]"
      />
    </div>
  )
}
