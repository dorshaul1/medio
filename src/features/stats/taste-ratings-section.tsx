import { Progress } from "@/components/ui/progress";
import type { RatingComparison, RatingDistribution } from "@/server/stats/types";

// A beautifully minimal distribution, not a dashboard bar chart — five
// rows, proportional width, no axis/legend/chrome (see docs/stats.md,
// "Rating distribution"), using the same `Progress` bar every other
// progress readout in this app uses. The count beside each bar carries
// the real information; the bar is decorative.
function RatingDistributionRows({
  distribution,
}: {
  distribution: NonNullable<RatingDistribution>;
}) {
  const max = Math.max(...distribution.buckets.map((bucket) => bucket.count));

  return (
    <div className="flex flex-col gap-1.5">
      {[...distribution.buckets].reverse().map((bucket) => (
        <div key={bucket.rating} className="flex items-center gap-3 text-sm">
          <span className="w-14 shrink-0 text-muted-foreground whitespace-nowrap">
            {bucket.rating} {bucket.rating === 1 ? "star" : "stars"}
          </span>
          <Progress
            aria-hidden="true"
            value={max > 0 ? (bucket.count / max) * 100 : 0}
            className="flex-1"
          />
          <span className="w-6 shrink-0 text-right text-muted-foreground">{bucket.count}</span>
        </div>
      ))}
    </div>
  );
}

export function TasteRatingsSection({
  distribution,
  comparison,
}: {
  distribution: RatingDistribution;
  comparison: RatingComparison;
}) {
  if (!distribution && !comparison) return null;

  return (
    <section aria-labelledby="taste-ratings" className="flex flex-col gap-4">
      <h2 id="taste-ratings" className="text-lg font-medium tracking-tight">
        Ratings
      </h2>

      {distribution ? <RatingDistributionRows distribution={distribution} /> : null}

      {comparison ? (
        <p className="text-sm text-muted-foreground">
          Movies average{" "}
          <span className="font-medium text-foreground">{comparison.movieAverage.toFixed(1)}</span>,
          Shows average{" "}
          <span className="font-medium text-foreground">{comparison.showAverage.toFixed(1)}</span>.
        </p>
      ) : null}
    </section>
  );
}
