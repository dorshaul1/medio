"use client";

import type { DensityPreferenceValue } from "@/server/db/schema/preferences";
import { DensityMiniPreview } from "./density-mini-preview";
import { updatePreferencesAction } from "./settings-actions";
import { VisualChoice } from "./visual-choice";

const OPTIONS: readonly { value: DensityPreferenceValue; label: string }[] = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
];

export function DensitySetting({ value }: { value: DensityPreferenceValue }) {
  return (
    <VisualChoice
      value={value}
      ariaLabel="Content density"
      options={OPTIONS.map((option) => ({
        ...option,
        preview: <DensityMiniPreview variant={option.value} />,
      }))}
      onChange={(next) => updatePreferencesAction({ density: next }).then(() => undefined)}
    />
  );
}
