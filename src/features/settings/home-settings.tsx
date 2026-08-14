import { Separator } from "@/components/ui/separator";
import type { UserPreferences } from "@/server/preferences/types";
import { CalendarDefaultSetting } from "./calendar-default-setting";
import { DiscoverDefaultSetting } from "./discover-default-setting";
import { FinishSoonSetting } from "./finish-soon-setting";
import { HomeCalendarViewSetting } from "./home-calendar-view-setting";
import { HomeLayoutSetting } from "./home-layout-setting";
import { SettingRow } from "./setting-row";
import { SettingsCategoryHeader } from "./settings-category-header";
import { ShowUpNextSetting } from "./show-up-next-setting";

// "Home layout" and "Show Up Next" are two deliberately separate rows —
// see docs/home.md, "Up Next is a separate preference": Up Next answers
// "what should I watch right now" and appears above every layout when on;
// Home layout answers "what fills the rest of the page". Kept visually
// distinct (a VisualChoice row, then a plain Switch row) so Show Up Next
// never reads as a fourth layout option.
export function HomeSettings({ preferences }: { preferences: UserPreferences }) {
  return (
    <div className="flex flex-col gap-2">
      <SettingsCategoryHeader
        title="Home & Discovery"
        description="How much Home emphasizes your own viewing versus what's new."
      />
      <Separator />
      <SettingRow
        title="Show Up Next"
        comment="Show your next episode to watch at the top of Home."
        htmlFor="show-up-next"
      >
        <ShowUpNextSetting value={preferences.showUpNext} />
      </SettingRow>
      <Separator />
      <SettingRow
        title="Home layout"
        comment="Choose what fills your Home below Up Next: a balanced mix, your own shows and saved titles, or your release calendar."
      >
        <HomeLayoutSetting value={preferences.homeLayout} />
      </SettingRow>
      <Separator />
      <SettingRow
        title="Home calendar view"
        comment="When Home layout is Calendar, show the upcoming agenda or the full calendar grid — separate from Calendar page view below, which is for the full Calendar page."
      >
        <HomeCalendarViewSetting value={preferences.homeCalendarView} />
      </SettingRow>
      <Separator />
      <SettingRow
        title="Show Finish Soon"
        comment="Surfaces shows that only need a few more aired episodes to finish."
        htmlFor="show-finish-soon"
      >
        <FinishSoonSetting value={preferences.showFinishSoon} />
      </SettingRow>
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
        comment="Sets which layout — the Upcoming agenda or the month grid — the full Calendar page opens to when you visit it directly. Separate from Home calendar view above."
      >
        <CalendarDefaultSetting value={preferences.calendarDefaultView} />
      </SettingRow>
    </div>
  );
}
