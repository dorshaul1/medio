// Pure composition — no I/O, no provider access. Takes the already-
// fetched, already-mapped `Person`/`PersonCredits` (server/media/types.ts)
// and derives everything the Person page actually renders: age,
// Directing/Writing/Producing/Acting sections (deduped, sorted, ordered by
// primary profession), and a small "Known For" selection. Kept separate
// from the fetch itself (see features/people/person-filmography.tsx) the
// same way server/home/classify.ts is kept separate from
// server/home/queries.ts — directly unit-testable without a database or a
// live TMDB call.
import type { Person, PersonCastCredit, PersonCrewCredit } from "@/server/media/types";
import type {
  CreditRole,
  PersonFilmographyEntry,
  PersonFilmographySection,
  PersonKnownForItem,
} from "./types";

// A small, curated Known For row only adds value once there's enough of a
// career to curate *from* — below this, it would just repeat the entire
// Filmography in a second, redundant shape.
const KNOWN_FOR_MIN_POOL = 3;
const KNOWN_FOR_LIMIT = 6;

// TMDB's crew department/job taxonomy spans dozens of values (Camera,
// Sound, Editing, Art, Costume, VFX, Thanks, Self, ...) — only these three
// creative categories get their own Filmography section; everything else
// is dropped rather than dumped into a catch-all "Crew" section (see
// docs/media-provider.md, "Crew normalization").
const WRITING_DEPARTMENT = "Writing";
const PRODUCING_JOBS = new Set(["Producer", "Executive Producer"]);

// TMDB's own convention for a re-used clip rather than a real appearance
// on the title — noise on a long-running actor's page, not real work (see
// docs/media-provider.md, "Self / Archive Footage").
const ARCHIVE_FOOTAGE_PATTERN = /\(archive footage\)/i;

// A real finding from rendered review against actual TMDB data (Christopher
// Nolan, Daniel Craig, ...): "Self" credits — talk-show appearances,
// making-of featurettes, award-show cameos, documentary narration — are
// extremely common for well-known directors/actors and, unfiltered,
// regularly outnumber and crowd out real dramatic roles at the top of
// Acting (sorted newest-first, and these skew recent/promotional). TMDB
// formats these several ways in practice — plain "Self", "Self (voice)",
// "Self - Director", "Self · Director / Writer / Producer" — so the
// pattern matches "Self" followed by whitespace, "(", or the end of the
// string. Kept conservative on the one axis that matters: a real
// character name simply starting with "self" with no separating
// whitespace ("Self-Made Man", "Selfish Villain") is never affected.
const SELF_APPEARANCE_PATTERN = /^self(\s|\(|$)/i;

function mediaKey(entry: { mediaType: string; mediaProviderId: number }): string {
  return `${entry.mediaType}:${entry.mediaProviderId}`;
}

// Newest first; missing release/air dates sort to the end rather than the
// top — an unknown date is not "the newest thing", it's just unknown (see
// docs/media-provider.md, "Filmography sorting").
function byYearDescending(a: { year: number | null }, b: { year: number | null }): number {
  if (a.year === null && b.year === null) return 0;
  if (a.year === null) return 1;
  if (b.year === null) return -1;
  return b.year - a.year;
}

function dedupeByMedia<T extends { mediaType: string; mediaProviderId: number }>(
  entries: readonly T[],
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const entry of entries) {
    const key = mediaKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }
  return result;
}

function buildActingSection(cast: readonly PersonCastCredit[]): PersonFilmographySection | null {
  const entries: PersonFilmographyEntry[] = dedupeByMedia(
    cast.filter((credit) => {
      const character = (credit.character ?? "").trim();
      return !ARCHIVE_FOOTAGE_PATTERN.test(character) && !SELF_APPEARANCE_PATTERN.test(character);
    }),
  )
    .map((credit) => ({
      mediaType: credit.mediaType,
      mediaProviderId: credit.mediaProviderId,
      title: credit.title,
      poster: credit.poster,
      year: credit.year,
      role: "acting" as const,
      context: credit.character,
      episodeCount: credit.episodeCount,
    }))
    .sort(byYearDescending);

  return entries.length > 0 ? { role: "acting", label: "Acting", entries } : null;
}

function buildCrewSection(
  crew: readonly PersonCrewCredit[],
  role: Exclude<CreditRole, "acting">,
  label: string,
  matches: (credit: PersonCrewCredit) => boolean,
): PersonFilmographySection | null {
  const entries: PersonFilmographyEntry[] = dedupeByMedia(crew.filter(matches))
    .map((credit) => ({
      mediaType: credit.mediaType,
      mediaProviderId: credit.mediaProviderId,
      title: credit.title,
      poster: credit.poster,
      year: credit.year,
      role,
      // Directing's own section heading already says "Directed" — a
      // per-row "Director" label would just repeat it. Writing/Producing
      // cover more than one real job each, so the specific one stays.
      context: role === "directing" ? null : credit.job,
      episodeCount: null,
    }))
    .sort(byYearDescending);

  return entries.length > 0 ? { role, label, entries } : null;
}

function primaryRoleFor(knownForDepartment: string | null): CreditRole {
  if (knownForDepartment === "Directing") return "directing";
  if (knownForDepartment === "Writing") return "writing";
  if (knownForDepartment === "Production") return "producing";
  return "acting";
}

// Orders sections by primary profession — a director's page leads with
// Directing, an actor's leads with Acting (see docs/media-provider.md,
// "Primary profession determines hierarchy"). `known_for_department` only
// picks the *lead* section; the rest keep a fixed, sensible fallback
// order rather than a second ranking pass.
function orderSections(
  sections: readonly PersonFilmographySection[],
  knownForDepartment: string | null,
): readonly PersonFilmographySection[] {
  const primary = primaryRoleFor(knownForDepartment);
  const fallback: readonly CreditRole[] = ["directing", "writing", "producing", "acting"];
  const order = [primary, ...fallback.filter((role) => role !== primary)];
  return [...sections].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
}

export function buildFilmographySections(
  person: Person,
  credits: { cast: readonly PersonCastCredit[]; crew: readonly PersonCrewCredit[] },
): readonly PersonFilmographySection[] {
  const sections = [
    buildCrewSection(credits.crew, "directing", "Directing", (c) => c.job === "Director"),
    buildCrewSection(
      credits.crew,
      "writing",
      "Writing",
      (c) => c.department === WRITING_DEPARTMENT,
    ),
    buildCrewSection(credits.crew, "producing", "Producing", (c) => PRODUCING_JOBS.has(c.job)),
    buildActingSection(credits.cast),
  ].filter((section): section is PersonFilmographySection => section !== null);

  return orderSections(sections, person.knownForDepartment);
}

// A small, deterministic ranking using `voteCount` — a signal TMDB
// already returns on the same combined-credits request (see
// docs/media-provider.md, "Known For"), never a separately fetched
// popularity endpoint, and never rendered itself (same "provider number
// used for sorting, not shown" precedent as Discover's top-rated
// `vote_count.gte` floor). If the pool is too small, or nothing in it has
// any real vote signal, "most voted" would be an arbitrary pick rather
// than a meaningful one — Known For is omitted entirely and the full
// Filmography leads instead (see docs/media-provider.md).
export function selectKnownFor(
  cast: readonly PersonCastCredit[],
  crew: readonly PersonCrewCredit[],
): readonly PersonKnownForItem[] {
  const pool = dedupeByMedia([...cast, ...crew].sort((a, b) => b.voteCount - a.voteCount));

  if (pool.length < KNOWN_FOR_MIN_POOL || pool.every((credit) => credit.voteCount === 0)) {
    return [];
  }

  return pool.slice(0, KNOWN_FOR_LIMIT).map((credit) => ({
    mediaType: credit.mediaType,
    mediaProviderId: credit.mediaProviderId,
    title: credit.title,
    poster: credit.poster,
    year: credit.year,
  }));
}

// Derived at render time, never persisted — a birthday alone (no death
// date) is common and still useful; an incomplete pair (only one of the
// two, or an unparseable date) yields `null` rather than a misleading
// number (see docs/media-provider.md, "Age").
export function personAge(
  birthday: string | null,
  deathday: string | null,
  asOf: Date = new Date(),
): number | null {
  if (!birthday) return null;

  const birth = new Date(`${birthday}T00:00:00Z`);
  const end = deathday ? new Date(`${deathday}T00:00:00Z`) : asOf;
  if (Number.isNaN(birth.getTime()) || Number.isNaN(end.getTime())) return null;

  let age = end.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = end.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && end.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}
