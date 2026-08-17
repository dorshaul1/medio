// Derives a one-or-two-letter avatar fallback from a display name — pure,
// no I/O, so it's trivially testable independent of the Avatar component
// that renders it. Never throws on messy input (empty/whitespace-only
// name, a single very long "word", extra internal spaces): a real name
// is never guaranteed clean, and a broken fallback would be worse than a
// generic one.
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]?.slice(0, 2).toUpperCase() ?? "?";
  const first = words[0]?.[0] ?? "";
  const last = words[words.length - 1]?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
}
