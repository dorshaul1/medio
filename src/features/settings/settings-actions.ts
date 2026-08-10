"use server";

import { revalidatePath } from "next/cache";
import { resetPreferences, updatePreferences } from "@/server/preferences/mutations";
import type { UserPreferences } from "@/server/preferences/types";

// Thin Server Action wrappers around the preferences domain — see
// docs/settings.md. Preferences affect rendering across the whole
// authenticated app (theme, density, motion, spoiler policy, Home
// composition, Discover's default view, the quick-Save default), so
// these revalidate the entire layout tree rather than one route, unlike
// the narrower per-page revalidation `opinion-actions.ts`/
// `movie-tracking-actions.ts` use.

export async function updatePreferencesAction(
  partial: Partial<UserPreferences>,
): Promise<UserPreferences> {
  const result = await updatePreferences(partial);
  revalidatePath("/", "layout");
  return result;
}

export async function resetPreferencesAction(): Promise<void> {
  await resetPreferences();
  revalidatePath("/", "layout");
}
