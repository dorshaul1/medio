// Application-owned Calendar / "Personal Release Intelligence" domain
// models — see docs/calendar.md. Nothing here is ever persisted as
// source of truth: every event is derived at request time from the
// user's own tracking/planning relationships plus current external
// release metadata (see CLAUDE.md, "Calendar").
import type { MediaImage } from "@/server/media/types";

// What relationship the user has with this title — drives both which
// events exist at all (see docs/calendar.md, "Personal relevance") and
// same-day ranking (see rank.ts). Never exposed as a raw score in the
// UI — only ever used to order/label events with real product copy.
export type ReleaseRelevance =
  | "activeShow"
  | "backlogShow"
  | "watchlistShow"
  | "backlogMovie"
  | "watchlistMovie";

type ReleaseEventCommon = {
  // ISO `YYYY-MM-DD` — a calendar date, never a timestamp. See
  // docs/calendar.md, "Date-only handling": this is never converted
  // through a UTC `Date` instant for comparison — see date.ts.
  date: string;
  relevance: ReleaseRelevance;
  // Whether this date is on or before "today" (see date.ts) — computed
  // once at composition time so grouping/UI code never has to re-derive
  // "is this actually available" from a raw date string itself (see
  // docs/calendar.md, "Episode airing semantics").
  hasAired: boolean;
};

// One Episode becoming available — also used for what the phase spec
// calls "SeasonPremiereEvent"/"ShowPremiereEvent" (`isSeasonPremiere`/
// `isShowPremiere`): structurally identical to a regular episode event
// (a title, a date, an episode coordinate), so kept as one type rather
// than three near-duplicate ones — see docs/calendar.md, "Event types".
export type EpisodeReleaseEvent = ReleaseEventCommon & {
  kind: "episode";
  showProviderId: number;
  showTitle: string;
  poster: MediaImage | null;
  // The show's own backdrop — the Calendar month view's one-release-a-day
  // background-art treatment (see docs/calendar.md, "Month view artwork")
  // reuses this, same field `MediaDetailHero`/`UpNextCard` already use.
  backdrop: MediaImage | null;
  seasonNumber: number;
  episodeNumber: number;
  episodeProviderId: number;
  episodeTitle: string;
  // The episode's own still — not the show poster — matching the "this
  // is an episode" visual language `EpisodeRow`/`DiaryEpisodeEntry`
  // already use elsewhere. Spoiler-sensitive: UI must gate this behind
  // `resolveEpisodeSpoilerDecision`, same as everywhere else (see
  // docs/calendar.md, "Spoiler protection").
  still: MediaImage | null;
  runtimeMinutes: number | null;
  isSeasonPremiere: boolean;
  isShowPremiere: boolean;
};

// A planned (Watchlist/Backlog) Movie reaching its one release date TMDB
// gives us (see docs/calendar.md, "Movie release limitations" — no
// theatrical/digital/physical type breakdown, since that isn't reliably
// available).
export type MovieReleaseEvent = ReleaseEventCommon & {
  kind: "movieRelease";
  movieProviderId: number;
  movieTitle: string;
  poster: MediaImage | null;
  backdrop: MediaImage | null;
};

export type ReleaseEvent = EpisodeReleaseEvent | MovieReleaseEvent;

// Same-show, same-date events collapse into one group (see group.ts) —
// UI renders one row per group, never one row per raw event.
export type ReleaseEventGroup = {
  date: string;
  events: readonly ReleaseEvent[];
};

// The one small session filter Calendar exposes — never a search box or
// a full filter toolbar (see docs/calendar.md, "Filtering"). "tv" (not
// "episodes") matches the product-facing vocabulary Diary/Discover
// already use.
export type CalendarFilter = "all" | "tv" | "movies";

// The two Calendar layouts — a chronological agenda (the default/
// primary) and a compact spatial month grid (secondary). Deliberately
// not Day/Week/Month/Year/Agenda like a generic calendar app — see
// docs/calendar.md, "Information architecture".
export type CalendarView = "upcoming" | "calendar";

export type ReleaseTimeline = {
  // Recently aired, still-unwatched releases within a short bounded
  // window (see constants.ts) — oldest-appropriate first is *not* the
  // order; see rank.ts for actual ordering.
  recent: readonly ReleaseEventGroup[];
  today: readonly ReleaseEventGroup[];
  tomorrow: readonly ReleaseEventGroup[];
  thisWeek: readonly ReleaseEventGroup[];
  later: readonly ReleaseEventGroup[];
};
