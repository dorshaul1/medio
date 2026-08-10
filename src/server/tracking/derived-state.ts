// Pure resolution of a show's derived viewing state — see
// docs/tracking.md for the full rule set. Never persisted; always
// recomputed from explicit state + current episode history + current
// provider status, so it can never go stale the way a stored
// `caught_up` flag would the moment a new episode airs.
import type { DerivedShowViewingState, ShowTrackingStatus } from "./types";

// TMDB's TV statuses that mean "not concluded" — kept local to this
// resolver (duplicated, deliberately, from the near-identical set in
// `features/shows/format-show-year-range.ts`): that's UI-presentation
// code in a different architectural layer, and this is server-only
// tracking domain logic. The two must not import from each other just to
// share a two-branch classification.
const ONGOING_STATUSES = new Set(["Returning Series", "Planned", "In Production", "Pilot"]);

export function resolveShowViewingState(input: {
  explicitState: ShowTrackingStatus | null;
  uniqueWatchedAiredCount: number;
  airedEpisodeCount: number;
  showStatus: string;
  // Whether a future/upcoming episode is known to be scheduled — the
  // caller determines this (e.g. from a provider "next episode to air"
  // field, when available). This function only distinguishes waiting
  // from caught_up based on what it's told; it never fetches anything.
  hasKnownFutureEpisode: boolean;
}): DerivedShowViewingState {
  // Explicit overrides always win, regardless of watch history.
  if (input.explicitState === "on_hold") return "on_hold";
  if (input.explicitState === "dropped") return "dropped";

  if (input.uniqueWatchedAiredCount === 0) return "unwatched";

  const allAiredWatched =
    input.airedEpisodeCount > 0 && input.uniqueWatchedAiredCount >= input.airedEpisodeCount;

  if (!allAiredWatched) return "watching";

  if (!ONGOING_STATUSES.has(input.showStatus)) return "completed";
  return input.hasKnownFutureEpisode ? "waiting" : "caught_up";
}
