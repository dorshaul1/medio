"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import type { ReactNode } from "react";
import { useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";

// The one reusable visual-preference primitive every appearance-ish
// setting builds on (Theme/Density/Motion/Spoiler protection/Home
// focus) — see docs/settings.md, "Visual preference component". Real
// Radix RadioGroup semantics underneath (roving tabindex, one checked
// value, a real accessible name per option); the miniature preview is
// decorative and lives beside/above the option's own text label, never
// as the only accessible information. Optimistic — the visible selection
// updates immediately, rolling back only if the write actually fails.
export function VisualChoice<T extends string>({
  value,
  options,
  ariaLabel,
  onChange,
}: {
  value: T;
  options: readonly { value: T; label: string; preview: ReactNode }[];
  ariaLabel: string;
  onChange: (value: T) => Promise<void>;
}) {
  const [current, setCurrent] = useState(value);
  const [, startTransition] = useTransition();
  const requestId = useRef(0);

  function select(next: T) {
    const id = ++requestId.current;
    const previous = current;
    setCurrent(next);
    startTransition(async () => {
      try {
        await onChange(next);
      } catch {
        if (requestId.current === id) setCurrent(previous);
      }
    });
  }

  return (
    <RadioGroupPrimitive.Root
      value={current}
      onValueChange={(next) => select(next as T)}
      aria-label={ariaLabel}
      className="flex flex-wrap gap-3"
    >
      {options.map((option) => (
        <RadioGroupPrimitive.Item
          key={option.value}
          value={option.value}
          className="group flex flex-col items-center gap-2 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <div
            className={cn(
              "overflow-hidden rounded-md border-2 transition-colors",
              current === option.value ? "border-primary" : "border-transparent",
            )}
          >
            {option.preview}
          </div>
          <span
            className={cn(
              "text-xs font-medium transition-colors",
              current === option.value ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {option.label}
          </span>
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
