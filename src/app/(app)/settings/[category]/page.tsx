import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppearanceSettings } from "@/features/settings/appearance-settings";
import { DataSettings } from "@/features/settings/data-settings";
import { DeveloperSettings } from "@/features/settings/developer-settings";
import { GeneralSettings } from "@/features/settings/general-settings";
import { HomeSettings } from "@/features/settings/home-settings";
import { isSettingsCategory, SETTINGS_CATEGORY_LABEL } from "@/features/settings/settings-params";
import { SpoilerSettings } from "@/features/settings/spoiler-settings";
import { TrackingSettings } from "@/features/settings/tracking-settings";
import { getCurrentUserPreferences } from "@/server/preferences/queries";

export default async function SettingsCategoryPage({ params }: PageProps<"/settings/[category]">) {
  const { category } = await params;
  if (!isSettingsCategory(category)) notFound();

  const preferences = await getCurrentUserPreferences();

  switch (category) {
    case "general":
      return <GeneralSettings />;
    case "appearance":
      return <AppearanceSettings preferences={preferences} />;
    case "tracking":
      return <TrackingSettings preferences={preferences} />;
    case "spoilers":
      return <SpoilerSettings preferences={preferences} />;
    case "home":
      return <HomeSettings preferences={preferences} />;
    case "data":
      return <DataSettings />;
    case "developer":
      return <DeveloperSettings />;
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/settings/[category]">): Promise<Metadata> {
  const { category } = await params;
  if (!isSettingsCategory(category)) return {};
  return { title: `${SETTINGS_CATEGORY_LABEL[category]} · Settings` };
}
