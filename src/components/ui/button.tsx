import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium outline-none transition-[color,background-color,border-color,opacity] select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:ring-3 focus-visible:ring-ring/50",
  {
    variants: {
      variant: {
        // Clay — the product's signature accent. Hover/active are distinct
        // hand-tuned tokens (not opacity), see globals.css.
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70 active:bg-secondary/60",
        outline: "border border-border bg-transparent hover:bg-muted active:bg-muted/70",
        ghost: "hover:bg-muted active:bg-muted/70",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 rounded-sm px-3 text-[0.8125rem]",
        lg: "h-10 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  // Explicitly destructured and re-attached below, not left inside the
  // `...props` spread — needed for callers that manage focus after a
  // dynamic UI change (e.g. Up Next's Mark Watched → Undo swap; see
  // docs/design-system.md).
  ref,
  ...props
}: ButtonProps) {
  if (asChild) {
    return (
      <Slot.Root
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </Slot.Root>
    );
  }

  return (
    <button
      ref={ref}
      data-slot="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading ? <Spinner className="size-4 text-current" /> : null}
      {/* Wrapping content keeps its own gap/layout when the spinner takes
          its place — invisible (not removed) so the button doesn't resize. */}
      <span className={cn("inline-flex items-center gap-1.5", loading && "invisible")}>
        {children}
      </span>
    </button>
  );
}

export { Button, buttonVariants };
