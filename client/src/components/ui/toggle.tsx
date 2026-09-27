import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// A HUD tab: framed, and grey with a floating outline while pressed (`hud-tab`).
const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-1 rounded-none hud-caps font-semibold whitespace-nowrap transition-colors outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "hud-tab",
        ghost:
          "text-muted-foreground hover:bg-foreground/8 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid aria-pressed:bg-foreground/8 aria-pressed:text-foreground",
      },
      size: {
        default: "h-8 min-w-8 px-3 text-sm",
        sm: "h-6 min-w-6 px-2.5 text-xs",
        lg: "h-9 min-w-9 px-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
