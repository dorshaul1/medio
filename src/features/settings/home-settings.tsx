import { Separator } from "@/components/ui/separator";
import type { UserPreferences } from "@/server/preferences/types";
import { CalendarDefaultSetting } from "./calendar-default-setting";
import { DiscoverDefaultSetting } from "./discover-default-setting";
import { FinishSoonSetting } from "./finish-soon-setting";
import { HomeFocusSetting } from "./home-focus-setting";
import { SettingRow } from "./setting-row";
import { SettingsCategoryHeader } from "./settings-category-header";

export function HomeSettings({ preferences }: { preferences: UserPreferences }) {
  return (
    <div className="flex flex-col gap-2">
      <SettingsCategoryHeader
        title="Home & Discovery"
        description="How much Home emphasizes your own viewing versus what's new."
      />
      <Separator />
      <SettingRow
        title="Home focus"
        comment="Personal emphasizes Up Next and Continue Watching. Discovery gives Trending and Popular more space. Balanced is the default mix."
      >
        <HomeFocusSetting value={preferences.homeFocus} />
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
        title="Default Calendar view"
        comment="Sets which layout — the Upcoming agenda or the Calendar month grid — Calendar opens to."
      >
        <CalendarDefaultSetting value={preferences.calendarDefaultView} />
      </SettingRow>
    </div>
  );
}
