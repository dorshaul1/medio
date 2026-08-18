"use client";

import type { MobileEpisodeControlsValue } from "@/server/db/schema/preferences";
import { updatePreferencesAction } from "./settings-actions";
import { TextChoice } from "./text-choice";

const OPTIONS: readonly { value: MobileEpisodeControlsValue; label: string }[] = [
  { value: "swipe", label: "Swipe" },
  { value: "checkbox", label: "Checkbox" },
  { value: "swipe_checkbox", label: "Both" },
];

export function MobileEpisodeControlsSetting({ value }: { value: MobileEpisodeControlsValue }) {
  return (
    <TextChoice
      value={value}
      ariaLabel="Mobile episode controls"
      options={OPTIONS}
      onChange={(next) =>
        updatePreferencesAction({ mobileEpisodeControls: next }).then(() => undefined)
      }
    />
  );
}
