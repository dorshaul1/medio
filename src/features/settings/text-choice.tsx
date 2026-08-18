"use client";

import { SegmentedControl } from "@/components/ui/segmented-control";
import { useOptimisticChoice } from "./use-optimistic-choice";

// A compact text-only segmented choice — for settings that change
// interaction behavior rather than layout, where a visual preview would
// be forced/meaningless (see docs/settings.md, "Default Save
// destination"). Layers optimistic-update/rollback behavior
// (`useOptimisticChoice`, shared with `VisualChoice`) on top of the
// canonical `SegmentedControl` visual.
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
  const { current, select } = useOptimisticChoice(value, onChange);

  return (
    <SegmentedControl
      value={current}
      options={options}
      ariaLabel={ariaLabel}
      onValueChange={select}
    />
  );
}
