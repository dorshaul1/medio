"use client";

import type { CalendarDefaultViewValue } from "@/server/db/schema/preferences";
import { updatePreferencesAction } from "./settings-actions";
import { TextChoice } from "./text-choice";

const OPTIONS: readonly { value: CalendarDefaultViewValue; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "calendar", label: "Calendar" },
];

// The same "upcoming"/"calendar" choice `CalendarDefaultSetting` offers
// for `/calendar` itself, reused here for a different destination: what
// the Calendar Home layout's body shows (see docs/home.md, "Calendar
// layout"). Only meaningful while Home layout is Calendar, but stays a
// real, always-visible preference like every other setting in this
// category, never a conditionally-hidden control.
export function HomeCalendarViewSetting({ value }: { value: CalendarDefaultViewValue }) {
  return (
    <TextChoice
      value={value}
      ariaLabel="Home calendar view"
      options={OPTIONS}
      onChange={(next) => updatePreferencesAction({ homeCalendarView: next }).then(() => undefined)}
    />
  );
}
