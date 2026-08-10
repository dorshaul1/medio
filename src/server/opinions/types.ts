// Application-owned personal opinion domain models. Private, user-owned
// data — never mirrors a TMDB DTO and never leaks into shared/public
// caches (see docs/opinions.md). `src/server/db/schema/opinions.ts` is
// the persistence for these; this file is what the rest of the app
// actually works with.
import type { OpinionMediaTypeValue } from "@/server/db/schema/opinions";

export type OpinionMediaType = OpinionMediaTypeValue;

export const RATING_MIN = 1;
export const RATING_MAX = 5;

export const NOTE_MAX_LENGTH = 4000;

export type MediaRating = {
  mediaType: OpinionMediaType;
  mediaProviderId: number;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
};

export type MediaNote = {
  mediaType: OpinionMediaType;
  mediaProviderId: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

// The composed personal-opinion projection for one piece of media — what
// Movie/Show Details actually render. Never a raw DB row; `rating`/`note`
// are `null` when unset — the two fields are genuinely independent (see
// docs/opinions.md): a user may rate only, note only, or both.
export type MediaOpinion = {
  rating: number | null;
  note: string | null;
};
