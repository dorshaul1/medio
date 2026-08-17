"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";

// A compact text-only segmented choice — for settings that change
// interaction behavior rather than layout, where a visual preview would
// be forced/meaningless (see docs/settings.md, "Default Save
// destination"). Same real RadioGroup semantics and optimistic-update
// behavior as `VisualChoice`, without a preview box.
export function TextChoice<T extends string>({
  value,
  options,
  ariaLabel,
  onChange,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
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
      className="inline-flex flex-wrap rounded-md border border-border p-0.5"
    >
      {options.map((option) => (
        <RadioGroupPrimitive.Item
          key={option.value}
          value={option.value}
          className={cn(
            "rounded-sm px-3 py-1.5 text-sm font-medium outline-none transition-colors",
            "focus-visible:ring-3 focus-visible:ring-ring/50",
            current === option.value
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
