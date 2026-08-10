"use client";

import type { SpoilerProtectionValue } from "@/server/db/schema/preferences";
import { updatePreferencesAction } from "./settings-actions";
import { SpoilerMiniPreview } from "./spoiler-mini-preview";
import { VisualChoice } from "./visual-choice";

const OPTIONS: readonly { value: SpoilerProtectionValue; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "standard", label: "Standard" },
  { value: "strict", label: "Strict" },
];

export function SpoilerSetting({ value }: { value: SpoilerProtectionValue }) {
  return (
    <VisualChoice
      value={value}
      ariaLabel="Spoiler protection"
      options={OPTIONS.map((option) => ({
        ...option,
        preview: <SpoilerMiniPreview variant={option.value} />,
      }))}
      onChange={(next) =>
        updatePreferencesAction({ spoilerProtection: next }).then(() => undefined)
      }
    />
  );
}
