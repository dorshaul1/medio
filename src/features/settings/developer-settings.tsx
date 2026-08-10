import { Separator } from "@/components/ui/separator";
import { ResetAllDataControl } from "./reset-all-data-control";
import { SeedMockDataControl } from "./seed-mock-data-control";
import { SettingRow } from "./setting-row";
import { SettingsCategoryHeader } from "./settings-category-header";

// Local testing tooling, never a real product category — see
// docs/settings.md, "Developer tools". The route/nav gate
// (`isDeveloperSettingsEnabled`) already keeps this unreachable in
// production; both controls below also re-check `NODE_ENV` at the
// domain layer as a second, independent guard.
export function DeveloperSettings() {
  return (
    <div className="flex flex-col gap-2">
      <SettingsCategoryHeader
        title="Developer"
        description="Local testing tools. Never available in a production build."
      />
      <Separator />
      <SettingRow
        title="Add mock data"
        comment="Fills this account with a realistic set of watched movies and episodes, ratings, and a Watchlist/Backlog entry — real TMDB titles, so Library, Diary, and Stats all have something real to show."
      >
        <SeedMockDataControl />
      </SettingRow>
      <Separator />
      <SettingRow
        title="Reset all data"
        comment="Permanently deletes everything this account has tracked — watch history, ratings, notes, planning, and preferences. Your account itself is kept. This can't be undone."
      >
        <ResetAllDataControl />
      </SettingRow>
    </div>
  );
}
