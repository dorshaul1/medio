import { Separator } from "@/components/ui/separator";
import type { UserPreferences } from "@/server/preferences/types";
import { SettingRow } from "./setting-row";
import { SettingsCategoryHeader } from "./settings-category-header";
import { SpoilerSetting } from "./spoiler-setting";

export function SpoilerSettings({ preferences }: { preferences: UserPreferences }) {
  return (
    <div className="flex flex-col gap-2">
      <SettingsCategoryHeader
        title="Spoilers"
        description="How much episode detail is hidden until you've actually watched it."
      />
      <Separator />
      <SettingRow
        title="Spoiler protection"
        comment="Standard hides an unwatched episode's description; Strict also hides its title and still. Watched episodes are always shown in full, and you can reveal a hidden one just for yourself. Shows and Seasons only — never Movies."
      >
        <SpoilerSetting value={preferences.spoilerProtection} />
      </SettingRow>
    </div>
  );
}
