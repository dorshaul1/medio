"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// A restrained 1-5 rating selector — same-size ring marks that fill
// solid up to the selected value, rather than stars: many products
// (including this one's own provider rating — see `providerRatingPart`,
// features/media/metadata-line.tsx) already use a star for a *different*
// rating concept, and a second star-shaped control next to it would be
// genuinely confusable, not just conventionally similar. Built on
// Radix's headless RadioGroup for real single-select semantics
// (roving-tabindex arrow-key navigation, one checked value, a real
// accessible name per option) with an entirely custom visual layer — the
// same "real primitive semantics, own visual design" approach
// `Calendar` already takes for date selection.
export function RatingControl({
  value,
  onValueChange,
  max = 5,
  labels,
  disabled = false,
  "aria-label": ariaLabel,
}: {
  value: number | null;
  onValueChange: (value: number) => void;
  max?: number;
  // One label per rating value, both the accessible name for that
  // option and its visible hover/focus tooltip content — e.g. `["Bad",
  // "Weak", "Good", "Great", "Excellent"]`.
  labels: readonly string[];
  disabled?: boolean;
  "aria-label": string;
}) {
  return (
    <RadioGroupPrimitive.Root
      value={value !== null ? String(value) : null}
      onValueChange={(next) => onValueChange(Number(next))}
      disabled={disabled}
      aria-label={ariaLabel}
      className="flex items-center gap-1"
    >
      {Array.from({ length: max }, (_, index) => index + 1).map((level) => {
        const label = labels[level - 1] ?? String(level);
        return (
          <Tooltip key={level}>
            <TooltipTrigger asChild>
              <RadioGroupPrimitive.Item
                value={String(level)}
                aria-label={label}
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full outline-none transition-colors",
                  "focus-visible:ring-3 focus-visible:ring-ring/50",
                  "disabled:pointer-events-none disabled:opacity-50",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-3 rounded-full border transition-colors",
                    value !== null && level <= value
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/35",
                  )}
                />
              </RadioGroupPrimitive.Item>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </RadioGroupPrimitive.Root>
  );
}
