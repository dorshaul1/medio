import "server-only";
import { eq } from "drizzle-orm";
import { requireSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { mediaNotes, mediaRatings } from "@/server/db/schema/opinions";
import { mediaPlanningItems } from "@/server/db/schema/planning";
import { userPreferences } from "@/server/db/schema/preferences";
import {
  episodeWatchEvents,
  movieWatchEvents,
  showTrackingState,
} from "@/server/db/schema/tracking";
import { assertDeveloperToolsEnabled } from "./guard";

// The one comprehensive wipe in the app — every table this user owns,
// in one transaction, except the account/session itself (this is
// developer testing tooling for clearing a local account back to
// "brand new," never account deletion — see docs/settings.md,
// "Developer tools"). Deliberately separate from — and far more
// destructive than — General's "Reset preferences", which only ever
// touches `user_preferences`.
export async function resetAllUserData(): Promise<void> {
  assertDeveloperToolsEnabled();
  const { user } = await requireSession();

  await db.transaction(async (tx) => {
    await tx.delete(movieWatchEvents).where(eq(movieWatchEvents.userId, user.id));
    await tx.delete(episodeWatchEvents).where(eq(episodeWatchEvents.userId, user.id));
    await tx.delete(showTrackingState).where(eq(showTrackingState.userId, user.id));
    await tx.delete(mediaRatings).where(eq(mediaRatings.userId, user.id));
    await tx.delete(mediaNotes).where(eq(mediaNotes.userId, user.id));
    await tx.delete(mediaPlanningItems).where(eq(mediaPlanningItems.userId, user.id));
    await tx.delete(userPreferences).where(eq(userPreferences.userId, user.id));
  });
}
