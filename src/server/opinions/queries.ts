import "server-only";
import { getMediaNote } from "./notes";
import { getMediaRating } from "./ratings";
import type { MediaOpinion, OpinionMediaType } from "./types";

// The one reusable read Movie/Show Details actually render — composes
// rating + note into one projection, in parallel (two small,
// independently-indexed lookups, never a join that would force both to
// exist together — a user may rate only or note only; see
// docs/opinions.md, "Independent opinion fields").
export async function getMediaOpinion(input: {
  mediaType: OpinionMediaType;
  mediaProviderId: number;
}): Promise<MediaOpinion> {
  const [rating, note] = await Promise.all([getMediaRating(input), getMediaNote(input)]);

  return {
    rating: rating?.rating ?? null,
    note: note?.content ?? null,
  };
}
