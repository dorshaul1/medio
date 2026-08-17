// Pure candidate-selection logic — no I/O. Decides *which* unique
// watched titles get expensive provider hydration, independent of the
// actual fetching (see hydrate.ts). Every explicitly must-include title
// (e.g. the most-rewatched movie, so it can always be displayed with
// real artwork) is always selected; remaining slots up to `limit` go to
// the most recently active titles — see docs/stats.md, "Provider
// metadata strategy". The same generic selection also bounds the
// smaller credits-hydration subset (see compose.ts,
// TASTE_CREDITS_HYDRATION_LIMIT) — just called again with a smaller
// `limit` over the already-selected candidates.
export type HydrationCandidate = {
  id: number;
  lastActivityAt: Date;
};

export function selectHydrationIds(input: {
  candidates: readonly HydrationCandidate[];
  mustIncludeIds: readonly number[];
  limit: number;
}): readonly number[] {
  const mustInclude = new Set(input.mustIncludeIds);
  const alwaysInclude = new Set(
    input.candidates.filter((c) => mustInclude.has(c.id)).map((c) => c.id),
  );
  // Defensive: a must-include id that isn't among `candidates` (shouldn't
  // happen in practice) is still honored rather than silently dropped.
  for (const id of mustInclude) alwaysInclude.add(id);

  const remainingSlots = Math.max(0, input.limit - alwaysInclude.size);
  const remaining = input.candidates
    .filter((c) => !alwaysInclude.has(c.id))
    .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())
    .slice(0, remainingSlots)
    .map((c) => c.id);

  return [...alwaysInclude, ...remaining];
}
