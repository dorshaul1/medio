import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // See `Input`'s own comment: `text-base` below `sm:` prevents
        // iOS Safari's focus auto-zoom through real typography, never a
        // zoom-disabling viewport hack.
        // `rounded-sm` — see `Input`'s own comment: inputs sit a step
        // tighter than buttons in the system's radius hierarchy.
        "flex min-h-20 w-full resize-y rounded-sm border border-input bg-transparent px-3 py-2 text-base text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/25",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
