// Pure title normalization — no I/O. The one shared definition of "are
// these two titles the same" that `matching.ts` (comparing a source
// title against provider search results) and `plan.ts`/tests both use —
// see docs/data-portability.md, "Media matching rules". Deliberately
// simple (case/whitespace/punctuation-insensitive exact comparison), not
// fuzzy similarity scoring — see CLAUDE.md, "Ambiguous media identity
// requires explicit review; do not silently fuzzy-match".
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents after NFKD decomposition
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function titlesMatch(a: string, b: string): boolean {
  return normalizeTitle(a) === normalizeTitle(b);
}
