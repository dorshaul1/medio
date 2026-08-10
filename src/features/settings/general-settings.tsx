import { Separator } from "@/components/ui/separator";
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
      <SettingRow
        title="Reset preferences"
        comment="Restores every setting on this page to its default. Your Library, watch history, ratings, and notes are never affected."
      >
        <ResetPreferencesControl />
      </SettingRow>
    </div>
  );
}
