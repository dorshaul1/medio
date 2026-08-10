// TMDB's TV statuses that mean "not concluded" — everything else
// ("Ended", "Canceled") is a closed run. Kept local to this formatter
// rather than a shared status enum: this is the one place the
// ongoing/concluded distinction actually drives product behavior (see
// docs/media-provider.md, "Show status vs. watch status" — this has
// nothing to do with a future personal watch status).
const ONGOING_STATUSES = new Set(["Returning Series", "Planned", "In Production", "Pilot"]);

// "2018–present" for a show still airing, "2018–2024" for a concluded
// multi-year run, or just "2018" when there's only one year to show —
// never a closed range for a show that hasn't actually concluded, even if
// its last aired episode happens to have a year on file.
export function formatShowYearRange(
  firstAirYear: number | null,
  lastAirYear: number | null,
  status: string,
): string {
  if (!firstAirYear) return "";
  if (ONGOING_STATUSES.has(status)) return `${firstAirYear}–present`;
  if (!lastAirYear || lastAirYear === firstAirYear) return `${firstAirYear}`;
  return `${firstAirYear}–${lastAirYear}`;
}
