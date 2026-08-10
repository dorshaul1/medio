// A date-only "has this actually come out yet" check, shared by movies
// (`releaseDate`) and episodes (`airDate`) — both are the same ISO
// YYYY-MM-DD shape from the same provider, so this is the one place that
// comparison lives rather than a slightly-different copy per feature.
// Parsed as UTC (not the Date constructor's local-timezone parsing) so
// the result never shifts a day depending on server/browser timezone — a
// missing date is conservatively treated as not yet released, never as
// "released" by default.
export function hasReleased(date: string | null, asOf: Date = new Date()): boolean {
  if (!date) return false;
  return new Date(`${date}T00:00:00Z`).getTime() <= asOf.getTime();
}
