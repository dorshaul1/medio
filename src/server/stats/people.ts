// Pure People (director/actor) ranking — no I/O, no provider popularity.
// See docs/stats.md, "Favorite directors"/"Favorite actors". Ranking is
// deterministic: average personal rating (desc), then rated-title count
// (desc) as a tie-breaker, then name (asc) as the final deterministic
// fallback. A person's TMDB popularity is never a signal here — only the
// user's own rated viewing history is.
import type { MediaImage } from "@/server/media/types";
import {
  MAX_FAVORITE_ACTORS,
  MAX_FAVORITE_DIRECTORS,
  MIN_RATED_TITLES_FOR_ACTOR,
  MIN_RATED_TITLES_FOR_DIRECTOR,
} from "./constants";
import type { PersonTasteStat, TasteTitle } from "./types";

type PersonCredit = { id: number; name: string; profile: MediaImage | null };

type PersonPool = Map<number, { name: string; profile: MediaImage | null; ratings: number[] }>;

function rankPool(pool: PersonPool, minRatedTitles: number, max: number): PersonTasteStat[] {
  return [...pool.entries()]
    .map(([personId, value]) => ({
      personId,
      name: value.name,
      profile: value.profile,
      ratedTitleCount: value.ratings.length,
      averageRating: value.ratings.reduce((sum, rating) => sum + rating, 0) / value.ratings.length,
    }))
    .filter((person) => person.ratedTitleCount >= minRatedTitles)
    .sort(
      (a, b) =>
        b.averageRating - a.averageRating ||
        b.ratedTitleCount - a.ratedTitleCount ||
        a.name.localeCompare(b.name),
    )
    .slice(0, max);
}

// Only rated titles ever reach this function's callers with non-empty
// `directors`/`cast` (see hydrate.ts) — but this also guards against a
// title carrying credits without a rating, so the "counted once per
// rated title" invariant holds regardless of what upstream provides.
function collectPeople(
  titles: readonly TasteTitle[],
  extractPeople: (title: TasteTitle) => readonly PersonCredit[],
): PersonPool {
  const pool: PersonPool = new Map();

  for (const title of titles) {
    if (title.rating === null) continue;
    const rating = title.rating;

    // Dedupe within one title first — a title crediting the same person
    // twice (e.g. duplicate cast rows) must still only count once for
    // that title's rating contribution.
    const seen = new Set<number>();
    for (const person of extractPeople(title)) {
      if (seen.has(person.id)) continue;
      seen.add(person.id);

      const existing = pool.get(person.id);
      if (existing) existing.ratings.push(rating);
      else pool.set(person.id, { name: person.name, profile: person.profile, ratings: [rating] });
    }
  }

  return pool;
}

// Movie-focused for this phase — a Show's per-episode directors are noisy
// and not a meaningful "favorite director" signal; see docs/stats.md,
// "Director scope". `CreditedPerson` carries no profile image, so every
// result starts with `profile: null` — compose.ts fills in a small,
// bounded, final portrait hydration after ranking (see hydrate.ts).
export function computeFavoriteDirectors(titles: readonly TasteTitle[]): PersonTasteStat[] {
  const pool = collectPeople(titles, (title) =>
    title.mediaType === "movie"
      ? title.directors.map((director) => ({ ...director, profile: null }))
      : [],
  );
  return rankPool(pool, MIN_RATED_TITLES_FOR_DIRECTOR, MAX_FAVORITE_DIRECTORS);
}

// Movies and Shows both contribute — see docs/stats.md, "Favorite
// actors". Cast credits already carry a profile image (from the same
// title-credits fetch used for ranking), so no extra Person fetch is
// needed here.
export function computeFavoriteActors(titles: readonly TasteTitle[]): PersonTasteStat[] {
  const pool = collectPeople(titles, (title) => title.cast);
  return rankPool(pool, MIN_RATED_TITLES_FOR_ACTOR, MAX_FAVORITE_ACTORS);
}
