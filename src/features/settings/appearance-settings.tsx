import { Separator } from "@/components/ui/separator";
import type { UserPreferences } from "@/server/preferences/types";
import { DensitySetting } from "./density-setting";
import { MotionSetting } from "./motion-setting";
import { SettingRow } from "./setting-row";
import { SettingsCategoryHeader } from "./settings-category-header";
import { ThemeSetting } from "./theme-setting";

export function AppearanceSettings({ preferences }: { preferences: UserPreferences }) {
  return (
    <div className="flex flex-col gap-2">
      <SettingsCategoryHeader
        title="Appearance"
        description="Control how the app looks and moves."
      />
      <Separator />
      <SettingRow
        title="Theme"
        comment="System follows your device automatically. Light and Dark stay fixed."
      >
        <ThemeSetting value={preferences.theme} />
      </SettingRow>
      <Separator />
      <SettingRow
        title="Content density"
        comment="Compact tightens spacing and shrinks artwork so more fits on screen — in Library, Diary, and episode lists."
      >
        <DensitySetting value={preferences.density} />
      </SettingRow>
      <Separator />
      <SettingRow
        title="Interface motion"
        comment="Reduced turns off non-essential animation; real state changes still work as normal."
      >
        <MotionSetting value={preferences.motion} />
      </SettingRow>
    </div>
  );
}
