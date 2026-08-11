import "server-only";
import { getPersonalStates } from "@/server/media/personal-state";
import type { MediaSummary, PersonSummary } from "@/server/media/types";
import { searchMovies, searchPeople, searchShows } from "@/server/tmdb/queries";
import type { SearchResultTypeFilter } from "./constants";
import { SEARCH_CANDIDATES_PER_TYPE } from "./constants";
import type { RankableCandidate } from "./rank";
import { rankSearchResults } from "./rank";
import type { SearchResult, UnifiedSearchResults } from "./types";

function resultId(kind: "movie" | "show" | "person", id: number): string {
  return `${kind}:${id}`;
}

// Unified Search's one composition function — see docs/media-provider.md,
// "Unified search ranking". Movies, Shows, and People are fetched in
// parallel, then ranked together in one pass (never three separate
// sorted lists, and never a fixed per-type quota — see rank.ts). Movie/
// show hits get one batched personal-state lookup; People never need
// one.
export async function searchAll(
  query: string,
  limit: number,
  typeFilter: SearchResultTypeFilter = "all",
): Promise<UnifiedSearchResults> {
  const [movieResult, showResult, personResult] = await Promise.allSettled([
    typeFilter === "all" || typeFilter === "movies" ? searchMovies(query) : Promise.resolve(null),
    typeFilter === "all" || typeFilter === "shows" ? searchShows(query) : Promise.resolve(null),
    typeFilter === "all" || typeFilter === "people" ? searchPeople(query) : Promise.resolve(null),
  ]);

  const failedTypes: UnifiedSearchResults["failedTypes"] = [
    ...(movieResult.status === "rejected" ? (["movies"] as const) : []),
    ...(showResult.status === "rejected" ? (["shows"] as const) : []),
    ...(personResult.status === "rejected" ? (["people"] as const) : []),
  ];

  const movies: readonly MediaSummary[] =
    movieResult.status === "fulfilled" && movieResult.value
      ? movieResult.value.items.slice(0, SEARCH_CANDIDATES_PER_TYPE)
      : [];
  const shows: readonly MediaSummary[] =
    showResult.status === "fulfilled" && showResult.value
      ? showResult.value.items.slice(0, SEARCH_CANDIDATES_PER_TYPE)
      : [];
  const people: readonly PersonSummary[] =
    personResult.status === "fulfilled" && personResult.value
      ? personResult.value.items.slice(0, SEARCH_CANDIDATES_PER_TYPE)
      : [];

  // One batched personal-state lookup for every Movie/Show candidate
  // being ranked (not just the ones that make the final cut) — bounded
  // to SEARCH_CANDIDATES_PER_TYPE per type, never per-result.
  const personalStates = await getPersonalStates([
    ...movies.map((media) => ({ mediaType: media.mediaType, mediaProviderId: media.id })),
    ...shows.map((media) => ({ mediaType: media.mediaType, mediaProviderId: media.id })),
  ]);

  const resultById = new Map<string, SearchResult>();
  const candidates: RankableCandidate[] = [];

  for (const media of movies) {
    const id = resultId("movie", media.id);
    const personalState = personalStates.get(`movie:${media.id}`) ?? { kind: "none" as const };
    resultById.set(id, { kind: "movie", media, personalState });
    candidates.push({
      id,
      names: [media.title, media.originalTitle],
      popularitySignal: media.voteCount,
      releaseYear: media.releaseYear,
      hasPersonalState: personalState.kind !== "none",
    });
  }

  for (const media of shows) {
    const id = resultId("show", media.id);
    const personalState = personalStates.get(`show:${media.id}`) ?? { kind: "none" as const };
    resultById.set(id, { kind: "show", media, personalState });
    candidates.push({
      id,
      names: [media.title, media.originalTitle],
      popularitySignal: media.voteCount,
      releaseYear: media.releaseYear,
      hasPersonalState: personalState.kind !== "none",
    });
  }

  for (const person of people) {
    const id = resultId("person", person.id);
    resultById.set(id, { kind: "person", person });
    candidates.push({
      id,
      names: [person.name],
      popularitySignal: person.popularity,
      releaseYear: null,
      hasPersonalState: false,
    });
  }

  const rankedIds = rankSearchResults(candidates, query);
  const ranked = rankedIds
    .map((id) => resultById.get(id))
    .filter((result): result is SearchResult => result !== undefined);

  return {
    results: ranked.slice(0, limit),
    hasMore: ranked.length > limit,
    failedTypes,
  };
}
