import type { LucideIcon } from "lucide-react";
import type { Route } from "next";

export type CommandGroup = "quick-actions" | "navigate" | "settings";

// One declarative command — see docs/search.md, "Command Center".
// `keywords` are every alias a user might reasonably type that isn't
// already in `label` ("taste" for Stats → Taste, "preferences" for
// Settings, "user" for Account, "releases" for Calendar) — matched with
// the exact same tiered `matchQuality` unified Search already uses (see
// `match.ts`), never a separate fuzzy scheme. A command is either a
// navigation (`href`) or a real action (`run`) — never both; `run`
// receives the router so an action command can navigate too (e.g. "Log
// watched" opens a nested search step rather than navigating directly).
export type Command = {
  id: string;
  label: string;
  keywords?: readonly string[];
  group: CommandGroup;
  icon: LucideIcon;
  // A short, optional secondary line — e.g. a Settings command's
  // category description, or Up Next's episode context.
  context?: string;
  shortcut?: string;
} & ({ href: Route } | { run: (context: CommandRunContext) => void | Promise<void> });

export type CommandRunContext = {
  router: { push: (href: Route) => void };
  openLogWatched: () => void;
  close: () => void;
};
