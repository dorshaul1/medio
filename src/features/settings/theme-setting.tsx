"use client";

import { useTheme } from "next-themes";
import type { ThemePreferenceValue } from "@/server/db/schema/preferences";
import { updatePreferencesAction } from "./settings-actions";
import { ThemeMiniPreview } from "./theme-mini-preview";
import { VisualChoice } from "./visual-choice";

const OPTIONS: readonly { value: ThemePreferenceValue; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

// Theme's one subtlety (see docs/settings.md, "Theme architecture"): the
// database row is the durable, cross-device record — what Settings shows
// and what a brand-new device is seeded with (via the root layout's
// `defaultTheme`, see app/layout.tsx) — but next-themes' own localStorage
// remains what actually paints *this* browser instantly and flicker-free.
// Selecting a value here does both: `setTheme` for this device's
// immediate, reload-free visual change, and the Server Action for the
// durable record. Neither is a second competing source of truth — one
// governs "what does this browser show right now," the other governs
// "what does a fresh device start from."
export function ThemeSetting({ value }: { value: ThemePreferenceValue }) {
  const { setTheme } = useTheme();

  return (
    <VisualChoice
      value={value}
      ariaLabel="Theme"
      options={OPTIONS.map((option) => ({
        ...option,
        preview: <ThemeMiniPreview variant={option.value} />,
      }))}
      onChange={async (next) => {
        setTheme(next);
        await updatePreferencesAction({ theme: next });
      }}
    />
  );
}
