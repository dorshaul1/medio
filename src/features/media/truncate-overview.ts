// Search engines/social previews truncate long meta descriptions anyway;
// doing it ourselves avoids an ugly mid-word cut and keeps the tag a
// sane length. Pure and synchronous — no framework/runtime dependency.
export function truncateOverview(overview: string, maxLength = 160): string {
  if (overview.length <= maxLength) return overview;

  const cut = overview.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${trimmed.trimEnd()}…`;
}
