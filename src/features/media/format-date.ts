// A short, locale-formatted date — "Apr 17, 2011". Shared by TMDB air
// dates (an ISO YYYY-MM-DD string, TMDB's own representation, past or
// future — there's no different formatting for "upcoming") and tracking
// timestamps (a real `Date`, e.g. `watchedAt`).
export function formatDate(value: Date | string): string {
  // A bare date string is parsed as UTC (appending T00:00:00Z) rather
  // than through the Date constructor's local-timezone parsing — avoids
  // the date shifting a day depending on the server/browser's timezone.
  // A real Date (already a specific instant) is formatted as-is.
  const date = typeof value === "string" ? new Date(`${value}T00:00:00Z`) : value;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: typeof value === "string" ? "UTC" : undefined,
  }).format(date);
}

// Date-plus-time — for the one place a bare date isn't enough to tell two
// moments apart: a rewatch history list, where more than one viewing can
// share the same calendar day (a double feature, or two clicks of "Watch
// again" minutes apart) and `formatDate` alone would render two entries
// identically. Always a real `Date` — tracking timestamps only, never a
// TMDB date string.
export function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}
