"use client";

import type { PlanningIntentValue } from "@/server/db/schema/planning";
import { updatePreferencesAction } from "./settings-actions";
import { TextChoice } from "./text-choice";

const OPTIONS: readonly { value: PlanningIntentValue; label: string }[] = [
  { value: "watchlist", label: "Watchlist" },
  { value: "backlog", label: "Backlog" },
];

export function DefaultSaveSetting({ value }: { value: PlanningIntentValue }) {
  return (
    <TextChoice
      value={value}
      ariaLabel="Default Save destination"
      options={OPTIONS}
      onChange={(next) =>
        updatePreferencesAction({ defaultSaveIntent: next }).then(() => undefined)
      }
    />
  );
}
