import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Filled variants are chamfered `hud-button`s: `btn-<color>` for a filled button,
// `plate-<color>` for a neutral one. Hover and focus come with the utility.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-none hud-caps text-base font-semibold whitespace-nowrap transition-all outline-none select-none active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "hud-button btn-action",
        secondary: "hud-button btn-neutral-button",
        destructive: "hud-button btn-destructive",
        outline: "hud-button plate-panel",
        // Ability slot on the in-run skill bar: a neutral plate that lights up on hover.
        skill: "hud-button plate-secondary hover:text-primary",
        ghost:
          "text-muted-foreground hover:bg-foreground/8 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid aria-expanded:bg-foreground/8 aria-expanded:text-foreground aria-pressed:bg-primary/15 aria-pressed:text-foreground",
        link: "tracking-normal text-primary normal-case underline-offset-4 hover:underline focus-visible:underline",
      },
      size: {
        default:
          "h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-7 gap-1 px-2 text-sm [--cut:5px] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-5 text-lg [--cut:8px] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9 [--cut:5px]",
        "icon-xs": "size-6 [--cut:4px] [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8 [--cut:5px]",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
