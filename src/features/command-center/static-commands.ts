import { CalendarDays, ChartNoAxesColumn, Compass, Home, Library, NotebookPen } from "lucide-react";
import type { Route } from "next";
import { SETTINGS_CATEGORY_ICON } from "@/features/settings/settings-nav";
import type { Command } from "./types";

// Every command that doesn't depend on the current route or live user
// data — the Command Center's own static registry (see docs/search.md,
// "Command Center"). Route-specific/dynamic commands (Up Next, Settings'
// own "you are here") are composed alongside this list at render time,
// never scattered across page components (see CLAUDE.md, "Command
// Center").
export const NAVIGATION_COMMANDS: readonly Command[] = [
  { id: "nav-home", label: "Home", group: "navigate", icon: Home, href: "/" },
  { id: "nav-discover", label: "Discover", group: "navigate", icon: Compass, href: "/discover" },
  { id: "nav-library", label: "Library", group: "navigate", icon: Library, href: "/library" },
  {
    id: "nav-calendar",
    label: "Calendar",
    group: "navigate",
    icon: CalendarDays,
    href: "/calendar",
    keywords: ["releases", "upcoming"],
  },
  {
    id: "nav-stats",
    label: "Stats",
    group: "navigate",
    icon: ChartNoAxesColumn,
    href: "/stats",
    keywords: ["overview", "activity"],
  },
  {
    id: "nav-stats-taste",
    label: "Stats → Taste",
    group: "navigate",
    icon: ChartNoAxesColumn,
    href: "/stats?tab=taste" as Route,
    keywords: ["taste", "genres", "favorite", "rewatch"],
  },
  {
    id: "nav-account",
    label: "Account",
    group: "navigate",
    icon: SETTINGS_CATEGORY_ICON.account,
    href: "/settings/account" as Route,
    keywords: ["user", "profile", "sign out", "log out", "password"],
  },
  {
    id: "nav-settings",
    label: "Settings",
    group: "navigate",
    icon: SETTINGS_CATEGORY_ICON.general,
    href: "/settings",
    keywords: ["preferences", "options"],
  },
  {
    id: "nav-settings-appearance",
    label: "Appearance settings",
    group: "settings",
    icon: SETTINGS_CATEGORY_ICON.appearance,
    href: "/settings/appearance" as Route,
    keywords: ["theme", "dark mode", "light mode", "density", "motion"],
  },
  {
    id: "nav-settings-tracking",
    label: "Tracking & Library settings",
    group: "settings",
    icon: SETTINGS_CATEGORY_ICON.tracking,
    href: "/settings/tracking" as Route,
    keywords: ["default save", "watchlist", "backlog"],
  },
  {
    id: "nav-settings-spoilers",
    label: "Spoiler settings",
    group: "settings",
    icon: SETTINGS_CATEGORY_ICON.spoilers,
    href: "/settings/spoilers" as Route,
    keywords: ["spoiler protection"],
  },
  {
    id: "nav-settings-home",
    label: "Home settings",
    group: "settings",
    icon: SETTINGS_CATEGORY_ICON.home,
    href: "/settings/home" as Route,
    keywords: ["up next", "finish soon", "home layout", "pick for me"],
  },
  {
    id: "nav-settings-defaults",
    label: "Defaults settings",
    group: "settings",
    icon: SETTINGS_CATEGORY_ICON.defaults,
    href: "/settings/defaults" as Route,
    keywords: ["default view", "default range"],
  },
  {
    id: "nav-settings-data",
    label: "Data settings",
    group: "settings",
    icon: SETTINGS_CATEGORY_ICON.data,
    href: "/settings/data" as Route,
    keywords: ["import", "export", "backup"],
  },
];

// Executed via `run`, not `href` — see `command-center-dialog.tsx`'s
// `openLogWatched`, which switches the dialog into its one nested step
// (media search → the exact same canonical logging flow Movie/Show
// Details already use, never a parallel implementation).
export const LOG_WATCHED_COMMAND: Command = {
  id: "action-log-watched",
  label: "Log something watched",
  group: "quick-actions",
  icon: NotebookPen,
  keywords: ["log", "watch", "mark watched", "record", "log watched"],
  run: ({ openLogWatched }) => openLogWatched(),
};

export const STATIC_COMMANDS: readonly Command[] = [LOG_WATCHED_COMMAND, ...NAVIGATION_COMMANDS];
