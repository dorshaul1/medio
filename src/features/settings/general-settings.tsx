import { Separator } from "@/components/ui/separator";
import { AppUpdateSetting } from "./app-update-setting";
import { InstallAppSetting } from "./install-app-setting";
import { ResetPreferencesControl } from "./reset-preferences-control";
import { SettingRow } from "./setting-row";
import { SettingsCategoryHeader } from "./settings-category-header";

// Deliberately thin — see docs/settings.md, "Settings considered and
// cut": Default start page conflicts with Home's own `/` route, and
// Week starts on/Time format/Date style have nothing real to attach to
// yet (Calendar has no real calendar grid; the app doesn't surface
// enough clock-time to justify a format preference).
export function GeneralSettings() {
  return (
    <div className="flex flex-col gap-2">
      <SettingsCategoryHeader
        title="General"
        description="App-wide behavior that doesn't fit a more specific category."
      />
      <Separator />
      {/* Client Component that renders nothing at all when there's no
          real install action available (see docs/pwa.md, "Install UX")
          — never a placeholder/disabled row. No separator directly
          around it on either side: it can render null, and a separator
          adjacent to a sometimes-empty row risks a doubled hairline
          with nothing between. `AppUpdateSetting` always renders real
          content, so the one separator below it is always safe. */}
      <InstallAppSetting />
      <AppUpdateSetting />
      <Separator />
      <SettingRow
        title="Reset preferences"
        comment="Restores every setting on this page to its default. Your Library, watch history, ratings, and notes are never affected."
      >
        <ResetPreferencesControl />
      </SettingRow>
    </div>
  );
}
