import { Progress } from "@/components/ui/progress";
import { pluralize } from "@/features/shows/pluralize";

// A quiet, readable progress readout — not a gamification meter (see
// docs/tracking.md and CLAUDE.md, "Tracking"). Uses aired episodes only:
// unaired episodes never count toward the denominator, so a partially
// aired season never implies the user is "behind" on episodes that
// haven't released yet.
export function SeasonProgress({
  airedCount,
  watchedCount,
}: {
  airedCount: number;
  watchedCount: number;
}) {
  if (airedCount === 0) return null;

  const ratio = (watchedCount / airedCount) * 100;

  return (
    <div className="flex items-center gap-2.5">
      <Progress value={ratio} className="w-28" />
      <span className="text-sm text-muted-foreground">
        {watchedCount} of {pluralize(airedCount, "episode")}
      </span>
    </div>
  );
}
