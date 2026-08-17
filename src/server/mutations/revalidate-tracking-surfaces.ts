import "server-only";
import { revalidatePath } from "next/cache";

// The one shared invalidation surface for every mutation that changes
// canonical watch-event or planning state — see docs/tracking.md,
// "Mutation architecture", and CLAUDE.md, "Mutations must define
// consistent downstream invalidation/update behavior across Home,
// Library, Diary, Calendar, Stats and Pick for Me." Before this existed,
// each tracking/planning Server Action hand-rolled its own
// `revalidatePath` list, and nearly-identical actions (e.g. "mark
// episode watched" vs. "unmark episode watched", "mark movie watched"
// vs. "put show on hold") had silently drifted to revalidate different
// subsets of the app — a show going On Hold wouldn't refresh Library,
// marking an episode watched wouldn't refresh Diary, marking a movie
// watched wouldn't refresh Home/Calendar even though it clears the
// movie's planning entry. Centralizing here makes that class of bug
// structurally impossible: every caller gets the full, correct surface
// by construction.
//
// Home, Calendar, Library, Stats, and Pick for Me are always
// revalidated, unconditionally — all five compose personalized state
// from the same canonical watch-event/planning tables at request time
// (Up Next/Continue Watching/Finish Soon/Backlog, "New Episode
// Available"/planned releases, Library rows/progress, viewing
// aggregates, and continuation/saved candidates respectively), so any
// write that reaches this function can plausibly affect all of them.
// Over-revalidating a route that a specific write didn't actually touch
// is harmless (Next.js simply refetches on the next visit); silently
// under-revalidating one is the real, demonstrated bug class this
// replaces — see the audit that motivated this module. `/library/diary`
// is the one surface gated behind `affectsDiary`, since planning-only
// writes (Save/Watchlist/Backlog) never touch a Diary-visible event row.
export function revalidateTrackingSurfaces(input: {
  movieProviderId?: number;
  showProviderId?: number;
  // Season pages this write concerns, if any — usually zero or one, but
  // a whole-show bulk action can touch several at once.
  seasonNumbers?: readonly number[];
  // Whether this write creates, deletes, or edits a canonical watch
  // event (Diary-visible) — false for planning-only writes.
  affectsDiary: boolean;
}): void {
  if (input.movieProviderId !== undefined) {
    revalidatePath(`/movies/${input.movieProviderId}`);
  }
  if (input.showProviderId !== undefined) {
    revalidatePath(`/shows/${input.showProviderId}`);
    for (const seasonNumber of input.seasonNumbers ?? []) {
      revalidatePath(`/shows/${input.showProviderId}/seasons/${seasonNumber}`);
    }
  }

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/library");
  revalidatePath("/stats");
  revalidatePath("/pick");
  if (input.affectsDiary) revalidatePath("/library/diary");
}
