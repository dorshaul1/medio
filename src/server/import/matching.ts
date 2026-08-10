import "server-only";
import type { MediaSummary, MediaType } from "@/server/media/types";
import { searchMovies, searchShows } from "@/server/tmdb/queries";
import { titlesMatch } from "./normalize";
import type { MatchCandidate, MediaIdentityRef, ResolvedIdentity } from "./types";

// Never expose more than a handful of candidates for manual review — a
// compact review experience, not a giant search workflow (see
// docs/data-portability.md, "Manual review").
const MAX_REVIEW_CANDIDATES = 5;
// Caps concurrent TMDB requests while resolving many distinct titles at
// once — bounded, never one unthrottled burst for a large import (see
// docs/data-portability.md, "Matching performance").
const RESOLUTION_CONCURRENCY = 8;

function toCandidate(item: MediaSummary): MatchCandidate {
  return {
    mediaType: item.mediaType,
    providerId: item.id,
    title: item.title,
    year: item.releaseYear,
    poster: item.poster,
  };
}

function resolved(item: MediaSummary): ResolvedIdentity {
  return {
    status: "resolved",
    mediaType: item.mediaType,
    providerId: item.id,
    title: item.title,
    year: item.releaseYear,
    poster: item.poster,
  };
}

function needsReview(items: readonly MediaSummary[]): ResolvedIdentity {
  return {
    status: "needsReview",
    candidates: items.slice(0, MAX_REVIEW_CANDIDATES).map(toCandidate),
  };
}

async function searchByMediaType(
  mediaType: MediaType,
  title: string,
): Promise<readonly MediaSummary[]> {
  const result = mediaType === "movie" ? await searchMovies(title) : await searchShows(title);
  return result.items;
}

// Resolves one title/year query against the provider — deterministic,
// never fuzzy-similarity-as-final-truth (see docs/data-portability.md,
// "Matching strategy"). All calls go through `server/tmdb/`, the
// existing provider integration boundary — never a direct TMDB call
// from anywhere else in the import domain.
export async function resolveTitleYear(
  mediaType: MediaType,
  title: string,
  year: number | null,
): Promise<ResolvedIdentity> {
  let items: readonly MediaSummary[];
  try {
    items = await searchByMediaType(mediaType, title);
  } catch {
    // Genuinely unavailable, distinct from "no match exists" — see
    // docs/data-portability.md, "Provider failure". Retryable.
    return { status: "lookupFailed" };
  }

  const titleMatches = items.filter(
    (item) => titlesMatch(item.title, title) || titlesMatch(item.originalTitle, title),
  );
  if (titleMatches.length === 0) return { status: "notFound" };

  if (year !== null) {
    const yearMatches = titleMatches.filter((item) => item.releaseYear === year);
    if (yearMatches.length === 1) return resolved(yearMatches[0] as MediaSummary);
    if (yearMatches.length > 1) return needsReview(yearMatches);
    // A title match exists but none share the source's year — a real,
    // unresolved conflict, never silently ignored by picking a
    // different year's title.
    return needsReview(titleMatches);
  }

  if (titleMatches.length === 1) return resolved(titleMatches[0] as MediaSummary);
  return needsReview(titleMatches);
}

function identityKey(mediaType: MediaType, title: string, year: number | null): string {
  return `${mediaType}:${title.trim().toLowerCase()}:${year ?? ""}`;
}

// Batches identity resolution across every `titleYear` ref in one parsed
// file: distinct (mediaType, title, year) tuples are resolved exactly
// once, however many records share them — a Letterboxd diary with 200
// entries for the same rewatched film issues one lookup, not 200 (see
// docs/data-portability.md, "Matching performance"). `native` imports
// never call this at all (their identity is already `known`).
export async function resolveIdentities(
  refs: readonly MediaIdentityRef[],
): Promise<ReadonlyMap<string, ResolvedIdentity>> {
  const distinct = new Map<string, { mediaType: MediaType; title: string; year: number | null }>();
  for (const ref of refs) {
    if (ref.kind !== "titleYear") continue;
    const key = identityKey(ref.mediaType, ref.title, ref.year);
    if (!distinct.has(key))
      distinct.set(key, { mediaType: ref.mediaType, title: ref.title, year: ref.year });
  }

  const entries = [...distinct.entries()];
  const resolvedMap = new Map<string, ResolvedIdentity>();

  for (let i = 0; i < entries.length; i += RESOLUTION_CONCURRENCY) {
    const chunk = entries.slice(i, i + RESOLUTION_CONCURRENCY);
    const results = await Promise.all(
      chunk.map(([, query]) => resolveTitleYear(query.mediaType, query.title, query.year)),
    );
    chunk.forEach(([key], index) => {
      const result = results[index];
      if (result) resolvedMap.set(key, result);
    });
  }

  return resolvedMap;
}

export function lookupResolvedIdentity(
  resolvedMap: ReadonlyMap<string, ResolvedIdentity>,
  ref: MediaIdentityRef,
): ResolvedIdentity {
  if (ref.kind === "known") {
    return {
      status: "resolved",
      mediaType: ref.mediaType,
      providerId: ref.providerId,
      title: "",
      year: null,
      poster: null,
    };
  }
  return resolvedMap.get(identityKey(ref.mediaType, ref.title, ref.year)) ?? { status: "notFound" };
}
