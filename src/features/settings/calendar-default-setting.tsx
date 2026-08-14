"use client";

import type { CalendarDefaultViewValue } from "@/server/db/schema/preferences";
import { updatePreferencesAction } from "./settings-actions";
import { TextChoice } from "./text-choice";

const OPTIONS: readonly { value: CalendarDefaultViewValue; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "calendar", label: "Calendar" },
];

export function CalendarDefaultSetting({ value }: { value: CalendarDefaultViewValue }) {
  return (
    <TextChoice
      value={value}
      ariaLabel="Calendar page view"
      options={OPTIONS}
      onChange={(next) =>
        updatePreferencesAction({ calendarDefaultView: next }).then(() => undefined)
      }
    />
  );
}
