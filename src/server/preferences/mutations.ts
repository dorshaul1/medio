import "server-only";
import { eq } from "drizzle-orm";
import { requireSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { userPreferences } from "@/server/db/schema/preferences";
import { toPreferences } from "./queries";
import type { UserPreferences } from "./types";

// Every setting persists immediately on change — there is no "Save
// Settings" button (see docs/settings.md, "Persistence UX"). One row per
// user, upserted in place: the first preference change ever made creates
// the row (missing columns fall back to their own schema defaults, so a
// fresh row is never "wrong" for anything the caller didn't touch);
// every change after that updates the same row. Never a caller-supplied
// user id — the acting user always comes from the session itself, same
// as every other domain in this app.
export async function updatePreferences(
  partial: Partial<UserPreferences>,
): Promise<UserPreferences> {
  const { user } = await requireSession();

  const [row] = await db
    .insert(userPreferences)
    .values({ userId: user.id, ...partial })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { ...partial, updatedAt: /* @__PURE__ */ new Date() },
    })
    .returning();

  if (!row) throw new Error("Failed to update preferences");
  return toPreferences(row);
}

// Restores every preference to its product default — see
// docs/settings.md, "Reset preferences". Deletes the row entirely rather
// than writing defaults back into it: "no row" and "every column at its
// default" are the same state (see `getCurrentUserPreferences`), so this
// is the simplest correct implementation. Never touches watch history,
// ratings, notes, planning, or the account itself — this table holds
// nothing but presentation/behavior preferences.
export async function resetPreferences(): Promise<void> {
  const { user } = await requireSession();

  await db.delete(userPreferences).where(eq(userPreferences.userId, user.id));
}
