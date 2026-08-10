// TMDB gives runtime in minutes only — "2h 28m" reads far faster than
// "148 min" in a metadata line. Pure, no framework dependency.
export function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}
