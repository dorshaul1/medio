import type { HomeLayoutValue } from "@/server/db/schema/preferences";

export type PublicHomeSection =
  | "trending_movies"
  | "trending_shows"
  | "in_theaters"
  | "popular_movies"
  | "popular_shows";

// Balanced's "restrained amount of discovery" — never the full public
// catalog; Discover already owns broad browsing (see CLAUDE.md,
// "Discovery is a dedicated product destination and should not be
// duplicated as a Home-layout option").
const BALANCED_PUBLIC_SECTIONS: readonly PublicHomeSection[] = [
  "trending_movies",
  "trending_shows",
];

// Personal's discovery is "minimal", never zero — a single row keeps
// Home from feeling like a closed loop.
const PERSONAL_PUBLIC_SECTIONS: readonly PublicHomeSection[] = ["trending_movies"];

export type HomeCalendarAgendaSize =
  // Balanced: a small, header-less teaser of what's most immediate.
  | "preview"
  // Calendar: the full Today/This week/Later agenda — the *only* body
  // content in this layout.
  | "full"
  // Personal: no calendar agenda on Home at all — Personal is entirely
  // about the user's own shows/Backlog, not the wider release calendar.
  | "none";

// What one Home layout actually composes below Up Next — see docs/home.md,
// "Home layout and composition". Deliberately more than a reorder: each
// layout changes *what exists on the page*, not just the sequence of a
// fixed set of rows (see CLAUDE.md, "Home layout changes composition and
// hierarchy meaningfully; it is not merely cosmetic row ordering").
//
// Up Next is deliberately NOT part of this type — it is governed entirely
// by the independent `showUpNext` preference and always renders above
// whichever layout body this resolves to (see docs/home.md, "Up Next is a
// separate preference"). This type must never grow a variant like
// `calendarWithUpNext`; composing the two preferences is the caller's job
// (`home-page.tsx`/`PersonalizedHomeSections`), never this resolver's.
export type HomeComposition = {
  mode: HomeLayoutValue;
  // Finish Soon + Continue Watching — the rest of personal continuation
  // beyond Up Next. Off for Calendar, whose body is calendar content only
  // (see CLAUDE.md, "Do not mix Continue Watching, discovery rows,
  // Backlog sections, etc. into the Calendar layout").
  showContinuationRows: boolean;
  publicSections: readonly PublicHomeSection[];
  calendarAgendaSize: HomeCalendarAgendaSize;
  showBacklogRow: boolean;
};

export function resolveHomeLayout(layout: HomeLayoutValue): HomeComposition {
  if (layout === "personal") {
    return {
      mode: "personal",
      showContinuationRows: true,
      publicSections: PERSONAL_PUBLIC_SECTIONS,
      calendarAgendaSize: "none",
      showBacklogRow: true,
    };
  }
  if (layout === "calendar") {
    // Calendar means Calendar — no Continue Watching, no Backlog row, no
    // discovery. Reuses the canonical Calendar/Release Intelligence
    // domain (see CLAUDE.md, "Calendar layout uses the canonical
    // Calendar/Release Intelligence domain").
    return {
      mode: "calendar",
      showContinuationRows: false,
      publicSections: [],
      calendarAgendaSize: "full",
      showBacklogRow: false,
    };
  }
  return {
    mode: "balanced",
    showContinuationRows: true,
    publicSections: BALANCED_PUBLIC_SECTIONS,
    calendarAgendaSize: "preview",
    showBacklogRow: false,
  };
}
