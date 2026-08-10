// TMDB IDs are positive integers. The route param arrives as a string
// (Next.js dynamic segments are always strings) — this is the one place
// that decides whether a given param could possibly be a real ID, so
// `page.tsx`/`generateMetadata` don't each hand-roll the same `Number(...)`
// + `Number.isInteger` check slightly differently.
export function parseMovieId(param: string): number | null {
  if (!/^\d+$/.test(param)) return null;
  const id = Number(param);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
