import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountSettings } from "@/features/settings/account-settings";
import { AppearanceSettings } from "@/features/settings/appearance-settings";
import { DataSettings } from "@/features/settings/data-settings";
import { DefaultsSettings } from "@/features/settings/defaults-settings";
import { DeveloperSettings } from "@/features/settings/developer-settings";
import { GeneralSettings } from "@/features/settings/general-settings";
import { HomeSettings } from "@/features/settings/home-settings";
import { isSettingsCategory, SETTINGS_CATEGORY_LABEL } from "@/features/settings/settings-params";
import { SpoilerSettings } from "@/features/settings/spoiler-settings";
import { TrackingSettings } from "@/features/settings/tracking-settings";
import { requireSession } from "@/server/auth/session";
import { getCurrentUserPreferences } from "@/server/preferences/queries";

export default async function SettingsCategoryPage({ params }: PageProps<"/settings/[category]">) {
  const { category } = await params;
  if (!isSettingsCategory(category)) notFound();

  switch (category) {
    case "account": {
      const { user } = await requireSession();
      return (
        <AccountSettings user={{ name: user.name, email: user.email, image: user.image ?? null }} />
      );
    }
    case "general":
      return <GeneralSettings />;
    case "appearance": {
      const preferences = await getCurrentUserPreferences();
      return <AppearanceSettings preferences={preferences} />;
    }
    case "tracking": {
      const preferences = await getCurrentUserPreferences();
      return <TrackingSettings preferences={preferences} />;
    }
    case "spoilers": {
      const preferences = await getCurrentUserPreferences();
      return <SpoilerSettings preferences={preferences} />;
    }
    case "home": {
      const preferences = await getCurrentUserPreferences();
      return <HomeSettings preferences={preferences} />;
    }
    case "defaults": {
      const preferences = await getCurrentUserPreferences();
      return <DefaultsSettings preferences={preferences} />;
    }
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
