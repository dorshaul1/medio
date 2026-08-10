// Pure candidate-selection logic — no I/O. Decides *which* unique
// watched titles get expensive provider hydration, independent of the
// actual fetching (see hydrate.ts). Every rated title (the strongest,
// most bounded taste signal) and every explicitly must-include title
// (e.g. the most-rewatched movie, so it can always be displayed with
// real artwork) is always selected; remaining slots up to `limit` go to
// the most recently active titles — see docs/stats.md, "Provider
// metadata strategy".
export type HydrationCandidate = {
  id: number;
  lastActivityAt: Date;
  isRated: boolean;
};

export function selectHydrationIds(input: {
  candidates: readonly HydrationCandidate[];
  mustIncludeIds: readonly number[];
  limit: number;
}): readonly number[] {
  const mustInclude = new Set(input.mustIncludeIds);
  const alwaysInclude = new Set(
    input.candidates.filter((c) => c.isRated || mustInclude.has(c.id)).map((c) => c.id),
  );

  const remainingSlots = Math.max(0, input.limit - alwaysInclude.size);
  const remaining = input.candidates
    .filter((c) => !alwaysInclude.has(c.id))
    .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())
    .slice(0, remainingSlots)
    .map((c) => c.id);

  return [...alwaysInclude, ...remaining];
}
