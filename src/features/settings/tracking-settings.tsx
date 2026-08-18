import { Separator } from "@/components/ui/separator";
import type { UserPreferences } from "@/server/preferences/types";
import { DefaultSaveSetting } from "./default-save-setting";
import { MobileEpisodeControlsSetting } from "./mobile-episode-controls-setting";
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
      {/* Mobile-presentation-only — this has no visible effect on
          desktop (the checkbox is always shown there), so it has no
          business showing up there either, see CLAUDE.md, "Settings":
          "if a setting can't be given a genuine, unambiguous effect,
          omit it rather than fake one." */}
      <div className="md:hidden">
        <Separator />
        <SettingRow
          title="Mobile episode controls"
          comment="How you mark an active show's next episode watched on mobile Library. Swipe reveals a check by swiping the row right; Checkbox keeps a compact tap control always visible; Both shows either."
        >
          <MobileEpisodeControlsSetting value={preferences.mobileEpisodeControls} />
        </SettingRow>
      </div>
    </div>
  );
}
