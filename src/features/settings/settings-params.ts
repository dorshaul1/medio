// Settings' category model — see docs/settings.md. A restrained, closed
// set (not twelve categories filling out navigation) — each one added
// only because it holds settings that actually exist. "Account" is who
// you are and how you sign in (identity, password, log out) — see
// "Account" in docs/settings.md — and comes first: it's both the
// destination the sidebar/mobile identity control opens directly and the
// most personally relevant category, ahead of product preferences.
// "General" is deliberately thin (just Reset — see docs/settings.md,
// "Settings considered and cut") rather than padded with settings that
// don't yet have a real, unambiguous product behavior to attach to.
// "Home" is genuinely Home's own composition (layout, Up Next, Finish
// Soon); "Defaults" is the separate, deliberately grouped set of "which
// view/tab does destination X open to" settings (Discover, Calendar,
// Stats) — kept apart from Home so Home doesn't accumulate unrelated
// other pages' defaults just because they were the first settings added.
//
// "Developer" is a special case: real local-testing tooling (seed mock
// data, wipe an account's data, inspect environment config), never
// visible to a real production user — same hard production gate
// `/design-system` already uses. It's part of the type (so the same
// route/switch code compiles regardless of environment) but filtered out
// of the rendered category list and rejected by `isSettingsCategory` in
// production — see `isDeveloperSettingsEnabled`.
export const SETTINGS_CATEGORIES = [
  "account",
  "general",
  "appearance",
  "tracking",
  "spoilers",
  "home",
  "defaults",
  "data",
  "developer",
] as const;
export type SettingsCategory = (typeof SETTINGS_CATEGORIES)[number];

export const SETTINGS_CATEGORY_LABEL: Record<SettingsCategory, string> = {
  account: "Account",
  general: "General",
  appearance: "Appearance",
  tracking: "Tracking & Library",
  spoilers: "Spoilers",
  home: "Home",
  defaults: "Defaults",
  data: "Data",
  developer: "Developer",
};

export const DEFAULT_SETTINGS_CATEGORY: SettingsCategory = "account";

// A plain env check, not a preference — this can never be true in a real
// production deployment, regardless of what any user or database row
// says (see docs/settings.md, "Developer tools").
export function isDeveloperSettingsEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function visibleSettingsCategories(): readonly SettingsCategory[] {
  if (isDeveloperSettingsEnabled()) return SETTINGS_CATEGORIES;
  return SETTINGS_CATEGORIES.filter((category) => category !== "developer");
}

export function isSettingsCategory(value: string): value is SettingsCategory {
  if (value === "developer") return isDeveloperSettingsEnabled();
  return (SETTINGS_CATEGORIES as readonly string[]).includes(value);
}
