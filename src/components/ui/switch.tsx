"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer relative inline-flex h-5 w-8 shrink-0 items-center rounded-full bg-muted outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        "data-[state=checked]:bg-primary",
        // The visible track (32×20) sits below a comfortable touch
        // target — an invisible `::before` (a generated box, not a real
        // element; taps on it still land on the switch itself) expands
        // the hit area to ~44×44 without growing the control on screen.
        "before:absolute before:-inset-x-1.5 before:-inset-y-3 before:content-['']",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-4 translate-x-0.5 rounded-full bg-background shadow-sm transition-transform",
          "data-[state=checked]:translate-x-[14px] data-[state=checked]:bg-primary-foreground",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
