// The one deterministic Spoiler policy — see docs/settings.md,
// "Spoiler protection". A pure function, no I/O: every surface that
// needs to know what to hide for an episode (currently just Season's
// `EpisodeRow`) calls this rather than re-implementing slightly
// different hiding rules independently.
import type { SpoilerProtectionValue } from "@/server/db/schema/preferences";

export type SpoilerDecision = {
  // Overview text hidden — Standard and Strict both hide it.
  hideOverview: boolean;
  // Still image and real title hidden (replaced with a neutral
  // placeholder / "Episode N") — Strict only.
  hideIdentity: boolean;
};

const NOT_HIDDEN: SpoilerDecision = { hideOverview: false, hideIdentity: false };

export function resolveEpisodeSpoilerDecision(input: {
  protection: SpoilerProtectionValue;
  // A watched episode is never spoiler-protected — there is nothing left
  // to spoil, and hiding it would just be confusing.
  watched: boolean;
}): SpoilerDecision {
  if (input.watched || input.protection === "off") return NOT_HIDDEN;
  if (input.protection === "standard") return { hideOverview: true, hideIdentity: false };
  return { hideOverview: true, hideIdentity: true };
}
