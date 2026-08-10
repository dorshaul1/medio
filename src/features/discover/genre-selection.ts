import type { Genre } from "@/server/media/types";

// A curated, ordered subset of TMDB's real genre list — not every genre
// TMDB has. Fetching/rendering all ~19 movie or ~16 TV genres on first
// load would be overwhelming and expensive (one request per genre row);
// this is the deliberate "featured order" a product designer would choose
// instead — see docs/media-provider.md ("Genre discovery"). Names must
// match TMDB's own genre names exactly — a name TMDB doesn't currently
// have is silently skipped by selectCuratedGenres, never invented.
// Six, not TMDB's full list — visually reviewed against nine and it read
// as an endless wall of near-identical rows rather than a structured,
// scannable set. Six keeps Discover feeling deliberate on both desktop
// and (especially) mobile, where each row is a real scroll cost.
export const CURATED_MOVIE_GENRES: readonly string[] = [
  "Action",
  "Comedy",
  "Drama",
  "Thriller",
  "Science Fiction",
  "Animation",
];

export const CURATED_SHOW_GENRES: readonly string[] = [
  "Drama",
  "Comedy",
  "Crime",
  "Reality",
  "Sci-Fi & Fantasy",
  "Animation",
];

// Filters TMDB's real genre list down to the curated set, in curated
// order (not TMDB's own ordering).
export function selectCuratedGenres(
  all: readonly Genre[],
  curatedNames: readonly string[],
): Genre[] {
  const byName = new Map(all.map((genre) => [genre.name, genre] as const));
  const selected: Genre[] = [];
  for (const name of curatedNames) {
    const genre = byName.get(name);
    if (genre) {
      selected.push(genre);
    }
  }
  return selected;
}

// A readable, URL-safe identifier derived from TMDB's own genre name —
// deliberately not a separate hardcoded slug↔ID table (see
// docs/media-provider.md, "Genre routes"). "Science Fiction" ->
// "science-fiction", "Sci-Fi & Fantasy" -> "sci-fi-and-fantasy".
export function genreSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function findGenreBySlug(all: readonly Genre[], slug: string): Genre | undefined {
  return all.find((genre) => genreSlug(genre.name) === slug);
}
