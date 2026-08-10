// TMDB IDs are positive integers. See the equivalent parseMovieId
// (features/movies/parse-movie-id.ts) for why this is a dedicated
// regex-based parse rather than a bare `Number(...)` check.
export function parseShowId(param: string): number | null {
  if (!/^\d+$/.test(param)) return null;
  const id = Number(param);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
