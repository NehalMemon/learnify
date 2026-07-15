import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/20 focus-visible:border-purple-500 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-purple-600 text-white hover:bg-purple-700",
        outline:
          "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
        secondary:
          "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
        ghost:
          "text-gray-600 hover:bg-gray-100",
        destructive:
          "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
        link: "text-purple-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-[44px] px-4 py-2 text-sm",
        xs: "min-h-[36px] px-2 py-1 text-xs",
        sm: "min-h-[40px] px-3 py-1.5 text-sm",
        lg: "min-h-[48px] px-5 py-2.5 text-base",
        icon: "size-9 p-2",
        "icon-xs": "size-7 p-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8 p-2",
        "icon-lg": "size-10 p-2.5",
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
  asChild = false,
  isLoading = false,
  disabled,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    isLoading?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"
  const isDisabled = Boolean(disabled || isLoading)

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-loading={isLoading ? "true" : undefined}
      aria-busy={isLoading || undefined}
      {...(!asChild ? { disabled: isDisabled } : {})}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
