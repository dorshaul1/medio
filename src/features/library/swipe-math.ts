// Pure gesture math for Library's mobile swipe-to-watch row — no DOM, no
// React, so the exact thresholds are directly unit-testable without
// simulating pointer events. See docs/library.md, "Swipe to watch".

// The reveal layer's full travel distance and the fraction of it a drag
// must cross to commit — both deliberately named constants, never a
// magic number inline (same discipline `server/pick/constants.ts`
// already established for this codebase).
export const SWIPE_MAX_TRAVEL_PX = 96;
export const SWIPE_COMMIT_RATIO = 0.6;

// How much more horizontal than vertical movement a touch needs before
// this locks into a swipe — high enough that an ordinary vertical scroll
// (which usually starts with at least a little incidental horizontal
// wobble) never gets mistaken for one.
const DIRECTION_LOCK_RATIO = 1.5;
// Ignore movement smaller than this entirely — a tap/press jitter should
// never resolve a direction at all.
const INTENT_DEAD_ZONE_PX = 8;

export type SwipeIntent = "pending" | "horizontal" | "vertical";

// `pending` — not enough movement yet to tell; caller keeps waiting.
// `horizontal` — this is a swipe; caller starts translating the row.
// `vertical` — this is a scroll; caller must never touch the row's
// position and let the browser's own scroll handle it from here on.
export function resolveSwipeIntent(dx: number, dy: number): SwipeIntent {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (absDx < INTENT_DEAD_ZONE_PX && absDy < INTENT_DEAD_ZONE_PX) return "pending";
  return absDx > absDy * DIRECTION_LOCK_RATIO ? "horizontal" : "vertical";
}

// Only a rightward drag reveals the action — "swipe right to check off"
// is the more natural convention for a positive completion action (the
// same direction Reminders/Things-style task apps use), and a real row
// starts well clear of the true screen edge (page padding, the poster's
// own margin), so it doesn't compete in practice with the browser's own
// edge-swipe-back gesture, which only activates from a touch starting
// within a narrow strip of the actual viewport edge. Clamped to the
// reveal layer's own travel distance — the row can never be dragged
// further than the action layer it's revealing.
export function clampSwipeTravel(dx: number): number {
  return Math.max(0, Math.min(SWIPE_MAX_TRAVEL_PX, dx));
}

// 0 at rest, 1 at full reveal — drives the reveal layer's opacity and
// the check icon's scale, and is what the commit threshold is judged
// against, never the raw pixel value (so it stays meaningful regardless
// of `SWIPE_MAX_TRAVEL_PX`).
export function swipeProgress(travel: number): number {
  return Math.abs(travel) / SWIPE_MAX_TRAVEL_PX;
}

export function isPastCommitThreshold(travel: number): boolean {
  return swipeProgress(travel) >= SWIPE_COMMIT_RATIO;
}
