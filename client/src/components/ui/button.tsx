import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-none border border-transparent bg-clip-padding hud-caps text-base font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.3),inset_0_-2px_0_oklch(0_0_0/0.18)] hover:bg-primary/90 dark:hover:shadow-[inset_0_1px_0_oklch(1_0_0/0.3),0_0_18px_-4px_var(--glow)]",
        outline:
          "border-border bg-panel text-foreground shadow-[inset_0_1px_0_var(--edge)] hover:border-primary/60 hover:bg-primary/10 hover:text-foreground aria-expanded:border-primary/60 aria-expanded:bg-primary/10",
        secondary:
          "border-border bg-secondary text-secondary-foreground shadow-[inset_0_1px_0_var(--edge)] hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_6%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "text-muted-foreground hover:bg-foreground/8 hover:text-foreground aria-expanded:bg-foreground/8 aria-expanded:text-foreground",
        destructive:
          "border-destructive/40 bg-destructive/12 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/18 dark:hover:bg-destructive/28 dark:focus-visible:ring-destructive/40",
        link: "tracking-normal text-primary normal-case underline-offset-4 hover:underline",
        // Bevelled square like an ability slot on the in-run skill bar.
        skill:
          "border-foreground/20 bg-linear-to-b from-secondary to-muted text-foreground shadow-[inset_0_1px_0_var(--edge),inset_0_-2px_0_oklch(0_0_0/0.22)] hover:border-primary hover:text-primary dark:hover:shadow-[inset_0_1px_0_var(--edge),0_0_14px_-4px_var(--glow)]",
      },
      size: {
        default:
          "h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-7 gap-1 px-2 text-sm has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-5 text-lg has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8",
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
