"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

// A compact single-select choice rendered as a bordered strip of text
// segments — real RadioGroup semantics underneath (roving tabindex, one
// checked value, a real accessible name per option), and the app's
// canonical answer for exactly this shape of choice (a handful of short
// text options picked between in place, e.g. Pick for Me's Format/Time,
// Settings' Default Save destination). `RadioGroup`'s vertical dot-list
// (`ui/radio-group.tsx`) is for a different shape — a longer list of
// options in a form, not an inline strip. See docs/design-system.md,
// "SegmentedControl". Purely presentation + Radix wiring — a caller that
// needs optimistic-write/rollback behavior on top (Settings' own
// `TextChoice`) layers that itself; `SegmentedControl` has no persistence
// opinion.
export function SegmentedControl<T extends string>({
  value,
  options,
  ariaLabel,
  onValueChange,
  className,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  ariaLabel: string;
  onValueChange: (value: T) => void;
  className?: string;
}) {
  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      aria-label={ariaLabel}
      className={cn("inline-flex flex-wrap rounded-md border border-border p-0.5", className)}
    >
      {options.map((option) => (
        <RadioGroupPrimitive.Item
          key={option.value}
          value={option.value}
          className={cn(
            "rounded-sm px-3 py-1.5 text-sm font-medium outline-none transition-colors select-none",
            "focus-visible:ring-3 focus-visible:ring-ring/50",
            option.value === value
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
