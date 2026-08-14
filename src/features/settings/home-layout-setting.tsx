"use client";

import type { HomeLayoutValue } from "@/server/db/schema/preferences";
import { HomeLayoutMiniPreview } from "./home-layout-mini-preview";
import { updatePreferencesAction } from "./settings-actions";
import { VisualChoice } from "./visual-choice";

const OPTIONS: readonly { value: HomeLayoutValue; label: string }[] = [
  { value: "balanced", label: "Balanced" },
  { value: "personal", label: "Personal" },
  { value: "calendar", label: "Calendar" },
];

export function HomeLayoutSetting({ value }: { value: HomeLayoutValue }) {
  return (
    <VisualChoice
      value={value}
      ariaLabel="Home layout"
      options={OPTIONS.map((option) => ({
        ...option,
        preview: <HomeLayoutMiniPreview variant={option.value} />,
      }))}
      onChange={(next) => updatePreferencesAction({ homeLayout: next }).then(() => undefined)}
    />
  );
}
