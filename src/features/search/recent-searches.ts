// GlobalSearch's recent-searches list — client-only, private to this
// browser (see docs/search.md): never sent to
// the server, never a "Search History" management surface, just a small
// convenience for repeat lookups. Capped at 5, most recent first.

const STORAGE_KEY = "medio.recent-searches";
const MAX_RECENT_SEARCHES = 5;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getRecentSearches(): readonly string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

// Moves `query` to the front, de-duplicated (case-insensitive), capped —
// a repeat search just re-promotes its existing entry rather than adding
// a second one.
export function addRecentSearch(query: string): readonly string[] {
  const trimmed = query.trim();
  if (!trimmed || !isBrowser()) return getRecentSearches();

  const existing = getRecentSearches().filter(
    (entry) => entry.toLowerCase() !== trimmed.toLowerCase(),
  );
  const next = [trimmed, ...existing].slice(0, MAX_RECENT_SEARCHES);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can legitimately fail (private browsing, quota) — recent
    // searches are a convenience, never worth surfacing an error for.
  }
  return next;
}

export function clearRecentSearches(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // See addRecentSearch.
  }
}
