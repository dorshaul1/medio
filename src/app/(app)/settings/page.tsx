import type { Metadata } from "next";
import { PageContainer } from "@/components/shell/page-container";
import { AppearanceSettings } from "@/features/settings/appearance-settings";
import { SettingsNav } from "@/features/settings/settings-nav";
import { DEFAULT_SETTINGS_CATEGORY } from "@/features/settings/settings-params";
import { getCurrentUserPreferences } from "@/server/preferences/queries";

export const metadata: Metadata = {
  title: "Settings",
};

// `/settings`'s own landing content — see docs/settings.md, "Settings
// information architecture". On mobile this is a plain category list
// and nothing else (no content stacked beneath it — see `SettingsNav`);
// tapping a category is a real navigation to `/settings/[category]`,
// which shows only that category's content plus a way back. On desktop,
// where the rail and content have always shown side by side, this
// renders exactly like `/settings/appearance` always has — Appearance
// content beside the rail — so desktop's landing experience is
// unchanged. (A plain `redirect()` to `/settings/appearance` would have
// been simpler but would remove the one URL mobile's "go back" link
// from a category page can land on to see the list again.)
export default async function SettingsPage() {
  const preferences = await getCurrentUserPreferences();

  return (
    <PageContainer>
      <div className="flex flex-col gap-8">
        <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Settings</h1>
        <div className="flex flex-col gap-8 md:flex-row md:gap-12">
          <SettingsNav active={DEFAULT_SETTINGS_CATEGORY} />
          <div className="hidden min-w-0 max-w-2xl flex-1 md:block">
            <AppearanceSettings preferences={preferences} />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
