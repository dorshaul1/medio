import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-md outline-none transition-[color,background-color,opacity] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus-visible:ring-3 focus-visible:ring-ring/50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70 active:bg-secondary/60",
        ghost: "text-foreground hover:bg-muted active:bg-muted/70",
      },
      size: {
        sm: "size-8 [&_svg]:size-4",
        default: "size-9 [&_svg]:size-4",
        lg: "size-10 [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "default",
    },
  },
);

// An accessible name is not optional for an icon-only control — requiring
// aria-label at the type level makes the unsafe version (icon, no label)
// impossible to write rather than merely discouraged.
type IconButtonProps = Omit<ComponentProps<"button">, "aria-label"> &
  VariantProps<typeof iconButtonVariants> & {
    "aria-label": string;
    asChild?: boolean;
  };

function IconButton({ className, variant, size, asChild = false, ...props }: IconButtonProps) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="icon-button"
      className={cn(iconButtonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { IconButton, iconButtonVariants };
