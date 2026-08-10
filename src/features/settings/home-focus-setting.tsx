"use client";

import type { HomeFocusValue } from "@/server/db/schema/preferences";
import { HomeFocusMiniPreview } from "./home-focus-mini-preview";
import { updatePreferencesAction } from "./settings-actions";
import { VisualChoice } from "./visual-choice";

const OPTIONS: readonly { value: HomeFocusValue; label: string }[] = [
  { value: "balanced", label: "Balanced" },
  { value: "personal", label: "Personal" },
  { value: "discovery", label: "Discovery" },
];

export function HomeFocusSetting({ value }: { value: HomeFocusValue }) {
  return (
    <VisualChoice
      value={value}
      ariaLabel="Home focus"
      options={OPTIONS.map((option) => ({
        ...option,
        preview: <HomeFocusMiniPreview variant={option.value} />,
      }))}
      onChange={(next) => updatePreferencesAction({ homeFocus: next }).then(() => undefined)}
    />
  );
}
