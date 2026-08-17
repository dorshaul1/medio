// Pure People (director/actor) ranking — no I/O, no provider popularity.
// See docs/stats.md, "Favorite directors"/"Favorite actors". Ranking is
// deterministic: how many of the user's own hydrated titles this person
// appears in (desc), then name (asc) as the final deterministic
// fallback. A person's TMDB popularity is never a signal here — only the
// user's own watch history is.
import type { MediaImage } from "@/server/media/types";
import {
  MAX_FAVORITE_ACTORS,
  MAX_FAVORITE_DIRECTORS,
  MIN_TITLES_FOR_ACTOR,
  MIN_TITLES_FOR_DIRECTOR,
} from "./constants";
import type { PersonTasteStat, TasteTitle } from "./types";

type PersonCredit = { id: number; name: string; profile: MediaImage | null };

type PersonPool = Map<number, { name: string; profile: MediaImage | null; titleCount: number }>;

function rankPool(pool: PersonPool, minTitles: number, max: number): PersonTasteStat[] {
  return [...pool.entries()]
    .map(([personId, value]) => ({
      personId,
      name: value.name,
      profile: value.profile,
      titleCount: value.titleCount,
    }))
    .filter((person) => person.titleCount >= minTitles)
    .sort((a, b) => b.titleCount - a.titleCount || a.name.localeCompare(b.name))
    .slice(0, max);
}

// Only credits-hydrated titles ever carry non-empty `directors`/`cast`
// (see hydrate.ts, TASTE_CREDITS_HYDRATION_LIMIT) — titles outside that
// window simply contribute nothing here, which is exactly the intended
// bounding behavior.
function collectPeople(
  titles: readonly TasteTitle[],
  extractPeople: (title: TasteTitle) => readonly PersonCredit[],
): PersonPool {
  const pool: PersonPool = new Map();

  for (const title of titles) {
    // Dedupe within one title first — a title crediting the same person
    // twice (e.g. duplicate cast rows) must still only count once for
    // that title's exposure contribution.
    const seen = new Set<number>();
    for (const person of extractPeople(title)) {
      if (seen.has(person.id)) continue;
      seen.add(person.id);

      const existing = pool.get(person.id);
      if (existing) existing.titleCount += 1;
      else pool.set(person.id, { name: person.name, profile: person.profile, titleCount: 1 });
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
  return rankPool(pool, MIN_TITLES_FOR_DIRECTOR, MAX_FAVORITE_DIRECTORS);
}

// Movies and Shows both contribute — see docs/stats.md, "Favorite
// actors". Cast credits already carry a profile image (from the same
// title-credits fetch used for ranking), so no extra Person fetch is
// needed here.
export function computeFavoriteActors(titles: readonly TasteTitle[]): PersonTasteStat[] {
  const pool = collectPeople(titles, (title) => title.cast);
  return rankPool(pool, MIN_TITLES_FOR_ACTOR, MAX_FAVORITE_ACTORS);
}
