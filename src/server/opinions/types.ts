// Application-owned personal opinion domain models. Private, user-owned
// data — never mirrors a TMDB DTO and never leaks into shared/public
// caches (see docs/opinions.md). `src/server/db/schema/opinions.ts` is
// the persistence for this; this file is what the rest of the app
// actually works with.
import type { OpinionMediaTypeValue } from "@/server/db/schema/opinions";

export type OpinionMediaType = OpinionMediaTypeValue;

export const COMMENT_MAX_LENGTH = 4000;

export type MediaComment = {
  mediaType: OpinionMediaType;
  mediaProviderId: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};
