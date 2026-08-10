"use client";

import type { MotionPreferenceValue } from "@/server/db/schema/preferences";
import { MotionMiniPreview } from "./motion-mini-preview";
import { updatePreferencesAction } from "./settings-actions";
import { VisualChoice } from "./visual-choice";

const OPTIONS: readonly { value: MotionPreferenceValue; label: string }[] = [
  { value: "system", label: "System" },
  { value: "full", label: "Full" },
  { value: "reduced", label: "Reduced" },
];

export function MotionSetting({ value }: { value: MotionPreferenceValue }) {
  return (
    <VisualChoice
      value={value}
      ariaLabel="Interface motion"
      options={OPTIONS.map((option) => ({
        ...option,
        preview: <MotionMiniPreview variant={option.value} />,
      }))}
      onChange={(next) => updatePreferencesAction({ motion: next }).then(() => undefined)}
    />
  );
}
