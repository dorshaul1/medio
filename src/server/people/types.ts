import type { MediaImage, MediaType } from "@/server/media/types";

// The product's own professional-credit grouping — not TMDB's raw
// department/job taxonomy (dozens of values across Camera/Sound/Editing/
// Art/VFX/...). Only the few genuinely product-relevant creative
// categories get a section; everything else is dropped by
// `buildFilmographySections` (see compose.ts) rather than surfaced.
export type CreditRole = "directing" | "writing" | "producing" | "acting";

// One row in a Filmography section — deliberately not `MediaSummary`:
// this needs role context (`context`/`episodeCount`) a browse tile has no
// use for, and deliberately omits overview/genres/rating a browse tile
// does carry (see docs/media-provider.md).
export type PersonFilmographyEntry = {
  mediaType: MediaType;
  mediaProviderId: number;
  title: string;
  poster: MediaImage | null;
  year: number | null;
  role: CreditRole;
  // Acting: the character name, or null when TMDB has none on file.
  // Directing: always null — "Directed" is already said by the section
  // heading, so repeating it per row would be noise. Writing/Producing:
  // the specific job (e.g. "Screenplay", "Executive Producer"), since
  // more than one exists per section and the distinction is useful.
  context: string | null;
  // TV acting credits only — how many episodes, so a long-running main
  // role reads differently from a one-episode guest spot. Never set for
  // movies or non-acting roles.
  episodeCount: number | null;
};

export type PersonFilmographySection = {
  role: CreditRole;
  label: string;
  entries: readonly PersonFilmographyEntry[];
};

// A small, curated "Known For" selection — poster/title/year only, same
// information level as a browse tile (see docs/media-provider.md). No
// role/character context: Known For is orientation, not the detailed
// credit list Filmography's sections are.
export type PersonKnownForItem = {
  mediaType: MediaType;
  mediaProviderId: number;
  title: string;
  poster: MediaImage | null;
  year: number | null;
};
