// Pure Home composition decisions driven by the "Home focus" preference
// — no I/O, testable independently of the page (see docs/settings.md,
// "Home focus"). Public discovery sections always render regardless of
// focus (a user with no active personal content must never see an empty
// Home) — focus only changes ordering and which/how many public sections
// appear, never removes personal sections entirely.
import type { HomeFocusValue } from "@/server/db/schema/preferences";

export type PublicHomeSection =
  | "trending_movies"
  | "trending_shows"
  | "in_theaters"
  | "popular_movies"
  | "popular_shows";

const ALL_PUBLIC_SECTIONS: readonly PublicHomeSection[] = [
  "trending_movies",
  "trending_shows",
  "in_theaters",
  "popular_movies",
  "popular_shows",
];

export type HomeLayout = {
  // Whether personalized sections (Up Next/Finish Soon/Continue
  // Watching) render above the public sections, or below them.
  personalFirst: boolean;
  publicSections: readonly PublicHomeSection[];
};

export function resolveHomeLayout(focus: HomeFocusValue): HomeLayout {
  if (focus === "personal") {
    // Fewer public sections, not zero — Trending stays as a light touch
    // of "what's out there" without competing for space with the
    // personal sections this focus is meant to emphasize.
    return { personalFirst: true, publicSections: ["trending_movies", "trending_shows"] };
  }
  if (focus === "discovery") {
    return { personalFirst: false, publicSections: ALL_PUBLIC_SECTIONS };
  }
  return { personalFirst: true, publicSections: ALL_PUBLIC_SECTIONS };
}
