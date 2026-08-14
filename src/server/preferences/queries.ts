import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { getCurrentSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { userPreferences } from "@/server/db/schema/preferences";
import type { UserPreferences } from "./types";

// Every deliberate product default in one place — see docs/settings.md,
// "Defaults". "No row" and "every column at its default" are the same
// state (see schema/preferences.ts), so this is also exactly what
// "Reset preferences" restores.
export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "system",
  density: "comfortable",
  motion: "system",
  defaultSaveIntent: "watchlist",
  spoilerProtection: "standard",
  homeLayout: "balanced",
  discoverDefaultType: "movies",
  calendarDefaultView: "upcoming",
  homeCalendarView: "calendar",
  showFinishSoon: true,
  showUpNext: true,
};

export function toPreferences(row: typeof userPreferences.$inferSelect): UserPreferences {
  return {
    theme: row.theme,
    density: row.density,
    motion: row.motion,
    defaultSaveIntent: row.defaultSaveIntent,
    spoilerProtection: row.spoilerProtection,
    homeLayout: row.homeLayout,
    discoverDefaultType: row.discoverDefaultType,
    calendarDefaultView: row.calendarDefaultView,
    homeCalendarView: row.homeCalendarView,
    showFinishSoon: row.showFinishSoon,
    showUpNext: row.showUpNext,
  };
}

// The real implementation, exported unwrapped only so tests can call it
// directly with a fresh result every time — `React.cache()` has no
// request boundary to scope itself to outside of an actual React render,
// so calling the cached export directly (see below) more than once in a
// test process would silently reuse the first call's memoized result
// instead of reflecting a newly-mocked session. Product code should
// always use `getCurrentUserPreferences`.
export async function fetchUserPreferences(): Promise<UserPreferences> {
  const session = await getCurrentSession();
  if (!session) return DEFAULT_PREFERENCES;

  const [row] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.user.id));

  return row ? toPreferences(row) : DEFAULT_PREFERENCES;
}

// Memoized per request (React's `cache`) — the root layout (Theme, to
// seed a new device without a flash — see docs/settings.md) and the
// authenticated app layout (Density/Motion) both need this on every
// request, and product code deep in the tree (Spoiler policy, Home
// composition, Discover's default type, the quick-Save action) all read
// it too. Without memoization that would be a separate DB round trip per
// call for the same row within one request — see docs/settings.md,
// "Preference loading performance". Safe to call from a public page:
// returns defaults for a signed-out visitor rather than requiring a
// session.
export const getCurrentUserPreferences = cache(fetchUserPreferences);
