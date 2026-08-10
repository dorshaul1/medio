"use client";

import type { DiscoverDefaultTypeValue } from "@/server/db/schema/preferences";
import { updatePreferencesAction } from "./settings-actions";
import { TextChoice } from "./text-choice";

const OPTIONS: readonly { value: DiscoverDefaultTypeValue; label: string }[] = [
  { value: "movies", label: "Movies" },
  { value: "shows", label: "Shows" },
];

export function DiscoverDefaultSetting({ value }: { value: DiscoverDefaultTypeValue }) {
  return (
    <TextChoice
      value={value}
      ariaLabel="Default Discover view"
      options={OPTIONS}
      onChange={(next) =>
        updatePreferencesAction({ discoverDefaultType: next }).then(() => undefined)
      }
    />
  );
}
