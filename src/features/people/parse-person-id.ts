// TMDB person IDs are positive integers, same shape as a movie/show ID —
// see parseMovieId (features/movies/) for why this validation is its own
// small function rather than each caller hand-rolling `Number(...)` +
// `Number.isInteger` slightly differently.
export function parsePersonId(param: string): number | null {
  if (!/^\d+$/.test(param)) return null;
  const id = Number(param);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
