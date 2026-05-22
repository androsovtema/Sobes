import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-cta text-brand hover:bg-cta/90 active:bg-cta/80",
        outline:
          "border-brand text-brand bg-transparent hover:bg-surface/60",
        secondary:
          "bg-surface text-brand hover:bg-surface/80",
        ghost:
          "text-brand hover:bg-surface/60",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive/20",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 gap-1.5 px-5",
        xs: "h-6 gap-1 px-3 text-xs",
        sm: "h-7 gap-1 px-4 text-[0.8rem]",
        lg: "h-11 gap-2 px-6 text-[15px]",
        icon: "size-9",
        "icon-xs": "size-6",
        "icon-sm": "size-7",
        "icon-lg": "size-11",
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
