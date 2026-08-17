import { Separator } from "@/components/ui/separator";
import type { UserPreferences } from "@/server/preferences/types";
import { CalendarDefaultSetting } from "./calendar-default-setting";
import { DiscoverDefaultSetting } from "./discover-default-setting";
import { SettingRow } from "./setting-row";
import { SettingsCategoryHeader } from "./settings-category-header";
import { StatsDefaultRangeSetting } from "./stats-default-range-setting";

// Every "which view/tab does this destination open to" setting, grouped
// together — see settings-params.ts. Deliberately separate from Home:
// none of these describe Home's own composition.
export function DefaultsSettings({ preferences }: { preferences: UserPreferences }) {
  return (
    <div className="flex flex-col gap-2">
      <SettingsCategoryHeader
        title="Defaults"
        description="Which view a few destinations open to by default."
      />
      <Separator />
      <SettingRow
        title="Default Discover view"
        comment="Sets which tab — Movies or Shows — Discover opens to."
      >
        <DiscoverDefaultSetting value={preferences.discoverDefaultType} />
      </SettingRow>
      <Separator />
      <SettingRow
        title="Calendar page view"
        comment="Sets which layout — the Upcoming agenda or the month grid — the full Calendar page opens to when you visit it directly. Separate from Home calendar view, which is for Home's own Calendar layout."
      >
        <CalendarDefaultSetting value={preferences.calendarDefaultView} />
      </SettingRow>
      <Separator />
      <SettingRow
        title="Default Stats range"
        comment="Sets which date range — All time, This year, or This month — Stats opens to."
      >
        <StatsDefaultRangeSetting value={preferences.statsDefaultRange} />
      </SettingRow>
    </div>
  );
}
