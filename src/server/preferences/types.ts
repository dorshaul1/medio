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
  HomeFocusValue,
  MotionPreferenceValue,
  SpoilerProtectionValue,
  ThemePreferenceValue,
} from "@/server/db/schema/preferences";

export type UserPreferences = {
  theme: ThemePreferenceValue;
  density: DensityPreferenceValue;
  motion: MotionPreferenceValue;
  defaultSaveIntent: PlanningIntentValue;
  spoilerProtection: SpoilerProtectionValue;
  homeFocus: HomeFocusValue;
  discoverDefaultType: DiscoverDefaultTypeValue;
  calendarDefaultView: CalendarDefaultViewValue;
  showFinishSoon: boolean;
};
