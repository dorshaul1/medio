import { Separator } from "@/components/ui/separator";
import type { UserPreferences } from "@/server/preferences/types";
import { DefaultSaveSetting } from "./default-save-setting";
import { SettingRow } from "./setting-row";
import { SettingsCategoryHeader } from "./settings-category-header";

// Deliberately thin — see docs/settings.md, "Settings considered and
// cut": Library default view, "after marking watched" behavior, rewatch-
// count visibility, and a quick-actions toggle were all evaluated and
// cut (the last one explicitly — quick tracking actions are one of the
// product's strongest interactions and stay permanently on).
export function TrackingSettings({ preferences }: { preferences: UserPreferences }) {
  return (
    <div className="flex flex-col gap-2">
      <SettingsCategoryHeader
        title="Tracking & Library"
        description="How saving and tracking behave across the app."
      />
      <Separator />
      <SettingRow
        title="Default Save destination"
        comment="Sets which list the one-click Save button uses. You can always move a saved title to the other list afterward."
      >
        <DefaultSaveSetting value={preferences.defaultSaveIntent} />
      </SettingRow>
    </div>
  );
}
