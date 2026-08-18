import type { Route } from "next";
import { BarChart3 } from "lucide-react";
import { describe, expect, it } from "vitest";
import { matchCommands } from "./match";
import type { Command } from "./types";

const STATS: Command = {
  id: "stats",
  label: "Stats",
  group: "navigate",
  icon: BarChart3,
  href: "/stats" as Route,
};
const STATS_TASTE: Command = {
  id: "stats-taste",
  label: "Stats → Taste",
  group: "navigate",
  icon: BarChart3,
  href: "/stats?tab=taste" as Route,
  keywords: ["taste"],
};
const ACCOUNT: Command = {
  id: "account",
  label: "Account",
  group: "navigate",
  icon: BarChart3,
  href: "/settings/account" as Route,
  keywords: ["user"],
};

const COMMANDS = [STATS, STATS_TASTE, ACCOUNT];

describe("matchCommands", () => {
  it("returns nothing for an empty query", () => {
    expect(matchCommands(COMMANDS, "")).toEqual([]);
  });

  it("excludes a command with zero textual relevance, never ranks it last", () => {
    const matched = matchCommands(COMMANDS, "zzzzz");
    expect(matched).toEqual([]);
  });

  it("finds a command by an exact keyword alias, not just its label", () => {
    const matched = matchCommands(COMMANDS, "taste");
    expect(matched[0]?.command.id).toBe("stats-taste");
    expect(matched[0]?.score).toBe(1);
  });

  it("finds Account for the alias 'user'", () => {
    const matched = matchCommands(COMMANDS, "user");
    expect(matched.map((m) => m.command.id)).toEqual(["account"]);
  });

  it("ranks an exact label match above a prefix match", () => {
    const matched = matchCommands(COMMANDS, "stats");
    // Both "Stats" (exact) and "Stats → Taste" (prefix) match.
    expect(matched[0]?.command.id).toBe("stats");
    expect(matched[0]?.score).toBe(1);
    expect(matched[1]?.command.id).toBe("stats-taste");
    expect(matched[1]?.score).toBeLessThan(1);
  });

  it("is stable on ties — same input always produces the same order", () => {
    const first = matchCommands(COMMANDS, "s").map((m) => m.command.id);
    const second = matchCommands(COMMANDS, "s").map((m) => m.command.id);
    expect(first).toEqual(second);
  });

  it("is case-insensitive", () => {
    expect(matchCommands(COMMANDS, "TASTE")[0]?.command.id).toBe("stats-taste");
  });
});
