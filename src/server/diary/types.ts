// Watch Diary domain models — see docs/diary.md. The Diary has no
// persistence of its own; every type here is either a normalized
// projection of `movie_watch_events`/`episode_watch_events`
// (`src/server/db/schema/tracking.ts`) or a view model composed from one
// of those plus provider metadata. Never a raw DB row, never a TMDB DTO.
import type { MediaImage } from "@/server/media/types";

// The two kinds of viewing event the Diary unifies. Deliberately not a
// third generic "media" concept — a movie viewing and an episode viewing
// have genuinely different identity, so they stay two concrete shapes
// everywhere in this domain, never one prop-optional type.
export type DiaryEventType = "movie" | "episode";

// Which subset of history a page is scoped to. "tv" means episode
// viewing events — not a raw provider `mediaType` value — see
// docs/diary.md, "Filtering", for why the product-facing label is "TV"
// rather than "Episodes".
export type DiaryFilter = "all" | "movies" | "tv";

export type DiarySort = "newest" | "oldest";

// A stable pagination boundary — the exact tuple the keyset query orders
// and compares by. Never a raw offset/page number — see docs/diary.md,
// "Pagination".
export type DiaryCursor = {
  watchedAt: Date;
  eventType: DiaryEventType;
  id: string;
};

// One raw viewing event, chronologically positioned — identity only, no
// provider metadata yet. `ordinal` is this event's 1-based position
// among every event for the same media identity (a movie's own provider
// id; an episode's own provider id), ordered by `watchedAt` across the
// user's *entire* history, computed once in SQL — never just the events
// on the current page. See docs/diary.md, "Rewatch ordinal".
export type MovieDiaryEvent = {
  eventType: "movie";
  id: string;
  movieProviderId: number;
  watchedAt: Date;
  ordinal: number;
};

export type EpisodeDiaryEvent = {
  eventType: "episode";
  id: string;
  showProviderId: number;
  seasonNumber: number;
  episodeNumber: number;
  episodeProviderId: number;
  watchedAt: Date;
  ordinal: number;
};

export type DiaryEvent = MovieDiaryEvent | EpisodeDiaryEvent;

// Hydrated view models — what Diary UI actually renders. `kind`
// discriminates all three shapes a Diary entry can take.
// `UnavailableDiaryEntry` is the one degraded shape: when provider
// hydration fails for one event, its identity/history is still real and
// still rendered, but no title is ever fabricated for it — see
// docs/diary.md, "Provider failure".
export type MovieDiaryEntry = {
  kind: "movie";
  id: string;
  watchedAt: Date;
  ordinal: number;
  movieProviderId: number;
  title: string;
  year: number | null;
  poster: MediaImage | null;
};

export type EpisodeDiaryEntry = {
  kind: "episode";
  id: string;
  watchedAt: Date;
  ordinal: number;
  showProviderId: number;
  seasonNumber: number;
  episodeNumber: number;
  episodeProviderId: number;
  showTitle: string;
  episodeTitle: string;
  showPoster: MediaImage | null;
  episodeStill: MediaImage | null;
};

// Carries the same real identity its hydrated counterpart would (never
// less than what `DiaryEntryMenu`'s Edit/Delete actions need to target
// the right event) — only the presentation fields that require
// successful provider hydration (title, artwork) are missing. Still a
// concrete discriminated shape per event type, not one optional bucket.
export type UnavailableMovieDiaryEntry = {
  kind: "unavailable";
  eventType: "movie";
  id: string;
  watchedAt: Date;
  ordinal: number;
  movieProviderId: number;
};

export type UnavailableEpisodeDiaryEntry = {
  kind: "unavailable";
  eventType: "episode";
  id: string;
  watchedAt: Date;
  ordinal: number;
  showProviderId: number;
  seasonNumber: number;
  episodeNumber: number;
};

export type UnavailableDiaryEntry = UnavailableMovieDiaryEntry | UnavailableEpisodeDiaryEntry;

export type DiaryEntry = MovieDiaryEntry | EpisodeDiaryEntry | UnavailableDiaryEntry;

export type DiaryPage = {
  entries: readonly DiaryEntry[];
  nextCursor: DiaryCursor | null;
  hasMore: boolean;
};
