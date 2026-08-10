import { FINISH_SOON_MAX_REMAINING_EPISODES } from "./constants";
import type { ActiveShowContinuation, PersonalHome } from "./types";

// Pure classification — no I/O, no provider/DB access. Takes already-
// hydrated, already-eligible candidates (every show here is guaranteed
// "watching" with a real next unwatched aired episode — ineligible shows
// never reach this function at all, see `queries.ts`) in most-recently-
// active-first order, and assigns each to exactly one Home bucket:
//
//   1. the most recently active candidate becomes Up Next
//   2. of the rest, ones with few remaining episodes become Finish Soon
//   3. everything else becomes Continue Watching
//
// This precedence is what guarantees a show never appears in more than
// one bucket — see docs/home.md, "Personalized-section deduplication".
export function classifyActiveShows(candidates: readonly ActiveShowContinuation[]): PersonalHome {
  const [upNext, ...rest] = candidates;

  const finishSoon: ActiveShowContinuation[] = [];
  const continueWatching: ActiveShowContinuation[] = [];
  for (const item of rest) {
    if (item.remainingAiredEpisodeCount <= FINISH_SOON_MAX_REMAINING_EPISODES) {
      finishSoon.push(item);
    } else {
      continueWatching.push(item);
    }
  }

  return { upNext: upNext ?? null, finishSoon, continueWatching };
}
