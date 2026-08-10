import type { CsvRow } from "./csv-parse";

// Case-insensitive, alias-tolerant header lookup. Letterboxd's export
// format could not be verified against a primary source in this
// environment (their own documentation pages return HTTP 403 to
// automated fetches — see docs/data-portability.md, "Known
// limitations"); parsers built against secondary technical sources stay
// defensive about exact header casing/naming rather than asserting one
// brittle exact string.
export function findColumn(row: CsvRow, ...aliases: string[]): string | undefined {
  const normalized = aliases.map((alias) => alias.toLowerCase());
  for (const [key, value] of Object.entries(row)) {
    if (normalized.includes(key.toLowerCase()) && value.trim().length > 0) return value;
  }
  return undefined;
}

export function hasColumn(headers: readonly string[], ...aliases: string[]): boolean {
  const normalized = aliases.map((alias) => alias.toLowerCase());
  return headers.some((header) => normalized.includes(header.toLowerCase()));
}
