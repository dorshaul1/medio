import { matchQuality, normalizeSearchText } from "@/server/search/rank";
import type { Command } from "./types";

// One deterministic, reusable command match — the exact same tiered
// `matchQuality` unified Search already uses for Movies/Shows/People
// (see docs/search.md, "Unified search ranking"), never a second fuzzy
// scheme. A command's score is the best tier across its label and every
// keyword/alias; zero means "didn't match at all" and the command is
// excluded, same rule media candidates already follow.
export type MatchedCommand = { command: Command; score: number };

export function matchCommands(
  commands: readonly Command[],
  query: string,
): readonly MatchedCommand[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const matched: MatchedCommand[] = [];
  for (const command of commands) {
    const names = [command.label, ...(command.keywords ?? [])];
    const score = Math.max(...names.map((name) => matchQuality(name, normalizedQuery)));
    if (score > 0) matched.push({ command, score });
  }

  // Stable on ties — same rule `rankSearchResults` documents: identical
  // input always produces identical order.
  return matched.sort((a, b) => b.score - a.score || a.command.id.localeCompare(b.command.id));
}
