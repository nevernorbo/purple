import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-none border border-input bg-background/60 px-3 py-2.5 text-base leading-relaxed shadow-[inset_0_1px_3px_oklch(0_0_0/0.12)] transition-colors outline-none placeholder:text-muted-foreground/80 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-black/25 dark:shadow-[inset_0_1px_4px_oklch(0_0_0/0.4)]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
