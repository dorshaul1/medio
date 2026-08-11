import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // `text-base` (16px) below `sm:` — iOS Safari auto-zooms the
        // whole page on focus for any input under 16px, a jarring PWA/
        // mobile-web experience; fixed through real typography, never a
        // viewport `user-scalable=no`/`maximum-scale` hack (that would
        // disable pinch-zoom entirely, an accessibility regression). Back
        // to the compact `text-sm` from `sm:` up, where no browser zooms.
        "flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-base text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/25",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
