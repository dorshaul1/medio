import { Progress } from "@/components/ui/progress";
import type { CompletionInsight, MovieVsShowInsight } from "@/server/stats/types";

function completionCopy(completion: NonNullable<CompletionInsight>): string {
  return completion.tendency === "finishes"
    ? "You usually finish the shows you start."
    : "You try a lot of shows, and stick with the ones that click.";
}

export function TastePatternsSection({
  movieVsShow,
  completion,
}: {
  movieVsShow: MovieVsShowInsight;
  completion: CompletionInsight;
}) {
  if (!movieVsShow && !completion) return null;

  return (
    <section aria-labelledby="taste-patterns" className="flex flex-col gap-5">
      <h2 id="taste-patterns" className="text-lg font-medium tracking-tight">
        Viewing patterns
      </h2>

      {movieVsShow ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-foreground">{movieVsShow.moviePercent}% movies</span>
            <span className="font-medium text-foreground">{movieVsShow.showPercent}% shows</span>
          </div>
          <Progress aria-hidden="true" value={movieVsShow.moviePercent} />
          <p className="text-xs text-muted-foreground">
            Based on {movieVsShow.totalTitles} unique titles you've watched.
          </p>
        </div>
      ) : null}

      {completion ? (
        <p className="text-sm text-muted-foreground">{completionCopy(completion)}</p>
      ) : null}
    </section>
  );
}
