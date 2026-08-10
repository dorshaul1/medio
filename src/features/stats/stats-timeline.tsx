import type { MonthlyActivity } from "@/server/stats/types";

// A restrained 12-month viewing-rhythm chart — see docs/stats.md,
// "Viewing timeline". Plain divs, no chart library: height alone carries
// the visual comparison (decorative, `aria-hidden`), while every column
// also carries a real, exact sr-only value so a screen reader gets the
// same information a sighted user reads from bar height, never an
// unlabeled SVG shape. Neutral tone throughout — this is a behavioral
// rhythm, not a primary action, so Clay stays reserved.
export function StatsTimeline({ timeline }: { timeline: readonly MonthlyActivity[] | null }) {
  if (!timeline || timeline.every((month) => month.eventCount === 0)) return null;

  const max = Math.max(...timeline.map((month) => month.eventCount), 1);

  return (
    <section aria-labelledby="stats-timeline" className="flex flex-col gap-4">
      <h2 id="stats-timeline" className="text-lg font-medium tracking-tight">
        Viewing activity
      </h2>
      <div className="flex items-end gap-1.5 sm:gap-2.5">
        {timeline.map((month) => (
          <div
            key={`${month.year}-${month.month}`}
            className="flex flex-1 flex-col items-center gap-2"
          >
            <div aria-hidden="true" className="flex h-24 w-full items-end">
              <div
                className="w-full rounded-sm bg-foreground/70"
                style={{ height: `${Math.max(2, (month.eventCount / max) * 100)}%` }}
              />
            </div>
            <span aria-hidden="true" className="text-[0.65rem] text-muted-foreground">
              {month.monthLabel}
            </span>
            <span className="sr-only">
              {month.monthLabel} {month.year}: {month.eventCount}{" "}
              {month.eventCount === 1 ? "viewing" : "viewings"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
