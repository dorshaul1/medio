import { redirect } from "next/navigation";
import { DEFAULT_SETTINGS_CATEGORY } from "@/features/settings/settings-params";

// `/settings` itself has no content of its own — it always resolves to
// its default category (see docs/settings.md).
export default function SettingsPage() {
  redirect(`/settings/${DEFAULT_SETTINGS_CATEGORY}`);
}
