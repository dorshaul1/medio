"use client";

import type { StatsDefaultRangeValue } from "@/server/db/schema/preferences";
import { updatePreferencesAction } from "./settings-actions";
import { TextChoice } from "./text-choice";

// Mirrors Stats' own three static range chips exactly — see
// docs/stats.md, "Date ranges".
const OPTIONS: readonly { value: StatsDefaultRangeValue; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "year", label: "This year" },
  { value: "month", label: "This month" },
];

export function StatsDefaultRangeSetting({ value }: { value: StatsDefaultRangeValue }) {
  return (
    <TextChoice
      value={value}
      ariaLabel="Default Stats range"
      options={OPTIONS}
      onChange={(next) =>
        updatePreferencesAction({ statsDefaultRange: next }).then(() => undefined)
      }
    />
  );
}
