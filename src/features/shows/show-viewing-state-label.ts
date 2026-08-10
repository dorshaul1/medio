import type { DerivedShowViewingState, ShowTrackingStatus } from "@/server/tracking/types";

// A presentation-only label — reads the already-computed derived state
// (see docs/tracking.md), never recomputes progress itself. The one
// nuance beyond a direct 1:1 mapping: a user who explicitly started
// tracking a show but hasn't logged an episode yet still resolves to the
// pure domain's `unwatched` (zero watched episodes) — but the UI should
// still say "Watching" for them, since they made an explicit choice.
// "Not started" is reserved for the real "no relationship at all yet"
// case: no explicit state *and* no watch history.
export function showViewingStateLabel(
  explicitState: ShowTrackingStatus | null,
  derivedState: DerivedShowViewingState,
): string {
  if (derivedState === "unwatched" && explicitState === null) return "Not started";

  switch (derivedState) {
    case "unwatched":
    case "watching":
      return "Watching";
    case "on_hold":
      return "On hold";
    case "dropped":
      return "Dropped";
    case "caught_up":
      return "Caught up";
    case "waiting":
      return "Waiting";
    case "completed":
      return "Completed";
  }
}
