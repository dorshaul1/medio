// Personal Settings persistence — see docs/settings.md. One row per user,
// created only once the user changes their first preference away from
// its default (same "a row only exists when it holds real, non-default
// content" convention `opinions.ts`'s `media_notes` already uses) —
// `getCurrentUserPreferences` returns hardcoded defaults when no row
// exists, so "no row" and "every column at its default" are the same
// state. "Reset preferences" is therefore just deleting the row.
import { relations, sql } from "drizzle-orm";
import { boolean, check, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { planningIntentValues } from "./planning";

export const themePreferenceValues = ["system", "light", "dark"] as const;
export type ThemePreferenceValue = (typeof themePreferenceValues)[number];

export const densityPreferenceValues = ["comfortable", "compact"] as const;
export type DensityPreferenceValue = (typeof densityPreferenceValues)[number];

export const motionPreferenceValues = ["system", "full", "reduced"] as const;
export type MotionPreferenceValue = (typeof motionPreferenceValues)[number];

export const spoilerProtectionValues = ["off", "standard", "strict"] as const;
export type SpoilerProtectionValue = (typeof spoilerProtectionValues)[number];

export const homeFocusValues = ["balanced", "personal", "discovery"] as const;
export type HomeFocusValue = (typeof homeFocusValues)[number];

export const discoverDefaultTypeValues = ["movies", "shows"] as const;
export type DiscoverDefaultTypeValue = (typeof discoverDefaultTypeValues)[number];

// Which of Calendar's two layouts (`server/calendar/types.ts`'s
// `CalendarView`, reused here) `/calendar` opens to by default — same
// "sets which tab a destination opens to" shape as `discoverDefaultType`.
export const calendarDefaultViewValues = ["upcoming", "calendar"] as const;
export type CalendarDefaultViewValue = (typeof calendarDefaultViewValues)[number];

export const userPreferences = pgTable(
  "user_preferences",
  {
    // The row's own natural identity — same reasoning as
    // `show_tracking_state`'s composite key (see schema/tracking.ts):
    // this is always looked up/updated by `userId` alone, and nothing
    // else ever references it by an independent id.
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    theme: text("theme", { enum: themePreferenceValues }).notNull().default("system"),
    density: text("density", { enum: densityPreferenceValues }).notNull().default("comfortable"),
    motion: text("motion", { enum: motionPreferenceValues }).notNull().default("system"),
    // Reuses Planning's own intent enum (`watchlist`/`backlog`) rather
    // than redefining it — this is literally that same domain value,
    // just as a default rather than a per-item choice; see
    // schema/planning.ts.
    defaultSaveIntent: text("default_save_intent", { enum: planningIntentValues })
      .notNull()
      .default("watchlist"),
    spoilerProtection: text("spoiler_protection", { enum: spoilerProtectionValues })
      .notNull()
      .default("standard"),
    homeFocus: text("home_focus", { enum: homeFocusValues }).notNull().default("balanced"),
    discoverDefaultType: text("discover_default_type", { enum: discoverDefaultTypeValues })
      .notNull()
      .default("movies"),
    calendarDefaultView: text("calendar_default_view", { enum: calendarDefaultViewValues })
      .notNull()
      .default("upcoming"),
    showFinishSoon: boolean("show_finish_soon").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Drizzle's `{ enum: [...] }` above is TypeScript-only — these are
    // the real, persistent invariants, same convention as every other
    // enum-shaped column in this app (see schema/tracking.ts).
    check("user_preferences_theme_check", sql`${table.theme} in ('system', 'light', 'dark')`),
    check("user_preferences_density_check", sql`${table.density} in ('comfortable', 'compact')`),
    check("user_preferences_motion_check", sql`${table.motion} in ('system', 'full', 'reduced')`),
    check(
      "user_preferences_default_save_intent_check",
      sql`${table.defaultSaveIntent} in ('watchlist', 'backlog')`,
    ),
    check(
      "user_preferences_spoiler_protection_check",
      sql`${table.spoilerProtection} in ('off', 'standard', 'strict')`,
    ),
    check(
      "user_preferences_home_focus_check",
      sql`${table.homeFocus} in ('balanced', 'personal', 'discovery')`,
    ),
    check(
      "user_preferences_discover_default_type_check",
      sql`${table.discoverDefaultType} in ('movies', 'shows')`,
    ),
    check(
      "user_preferences_calendar_default_view_check",
      sql`${table.calendarDefaultView} in ('upcoming', 'calendar')`,
    ),
  ],
);

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(user, { fields: [userPreferences.userId], references: [user.id] }),
}));
