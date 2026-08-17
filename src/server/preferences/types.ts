// Application-owned Settings domain models — see docs/settings.md.
// `UserPreferences` is always fully populated (every field has a
// deliberate product default — see `DEFAULT_PREFERENCES` in
// `queries.ts`); product code never has to handle "preference not set
// yet" as a distinct state.

import type { PlanningIntentValue } from "@/server/db/schema/planning";
import type {
  CalendarDefaultViewValue,
  DensityPreferenceValue,
  DiscoverDefaultTypeValue,
  HomeLayoutValue,
  MotionPreferenceValue,
  SpoilerProtectionValue,
  StatsDefaultRangeValue,
  ThemePreferenceValue,
} from "@/server/db/schema/preferences";

export type UserPreferences = {
  theme: ThemePreferenceValue;
  density: DensityPreferenceValue;
  motion: MotionPreferenceValue;
  defaultSaveIntent: PlanningIntentValue;
  spoilerProtection: SpoilerProtectionValue;
  homeLayout: HomeLayoutValue;
  discoverDefaultType: DiscoverDefaultTypeValue;
  calendarDefaultView: CalendarDefaultViewValue;
  // Which of Stats' three static range chips `/stats` opens to — see
  // `resolveDefaultStatsRange` (server/stats/range.ts).
  statsDefaultRange: StatsDefaultRangeValue;
  // Whether the Calendar Home layout's body shows the upcoming agenda or
  // the full calendar grid — only meaningful when `homeLayout ===
  // "calendar"`, but always a real, durable preference like every other
  // (see docs/home.md, "Calendar layout").
  homeCalendarView: CalendarDefaultViewValue;
  showFinishSoon: boolean;
  // Independent of `homeLayout` — see docs/home.md, "Up Next is a
  // separate preference".
  showUpNext: boolean;
  // Whether Home's header shows the "Pick for me" entry point — defaults
  // to `false`; see docs/recommendations.md.
  showPickForMe: boolean;
};
