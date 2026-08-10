// TMDB's season numbers are non-negative integers — season 0 is a real,
// valid season (Specials; see sort-seasons.ts), so unlike parseShowId
// this deliberately accepts 0. Only negative numbers, decimals, and
// non-numeric input are invalid.
export function parseSeasonNumber(param: string): number | null {
  if (!/^\d+$/.test(param)) return null;
  const seasonNumber = Number(param);
  return Number.isSafeInteger(seasonNumber) ? seasonNumber : null;
}
