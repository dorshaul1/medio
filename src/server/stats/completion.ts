// Pure completion-tendency logic — no I/O, no derived per-show state
// (Caught up/Waiting/Completed require per-season provider hydration this
// domain deliberately avoids at Taste's scale — see docs/stats.md,
// "Completion behavior"). Built only from `show_tracking_state`'s
// explicit, already-cheap counts.
import {
  FINISHES_TENDENCY_MAX_DROPPED_RATIO,
  MIN_TRACKED_SHOWS_FOR_COMPLETION_TENDENCY,
} from "./constants";
import type { CompletionInsight } from "./types";

export function computeCompletionInsight(counts: {
  watching: number;
  onHold: number;
  dropped: number;
}): CompletionInsight {
  const trackedShowCount = counts.watching + counts.onHold + counts.dropped;
  if (trackedShowCount < MIN_TRACKED_SHOWS_FOR_COMPLETION_TENDENCY) return null;

  const droppedRatio = counts.dropped / trackedShowCount;
  return {
    tendency: droppedRatio <= FINISHES_TENDENCY_MAX_DROPPED_RATIO ? "finishes" : "explores",
    trackedShowCount,
    droppedShowCount: counts.dropped,
    onHoldShowCount: counts.onHold,
  };
}
