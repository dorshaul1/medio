import type { RewatchInsights } from "@/server/stats/types";
import { TasteTitleCard } from "./taste-title-card";

// Rewatch behavior is one of this app's genuinely unique signals (see
// docs/stats.md, "Rewatch insights") — real artwork for the two
// delightful title-level moments, plus one clearly-explained supporting
// percentage. Nothing renders here at all until real rewatch evidence
// exists (see docs/stats.md, "Rewatch rate") — no empty placeholder card.
export function TasteRewatchSection({ rewatch }: { rewatch: RewatchInsights }) {
  const { mostRewatchedMovie, mostRevisitedShow, rewatchRatePercent } = rewatch;
  if (!mostRewatchedMovie && !mostRevisitedShow && rewatchRatePercent === null) return null;

  return (
    <section aria-labelledby="taste-rewatch" className="flex flex-col gap-4">
      <h2 id="taste-rewatch" className="text-lg font-medium tracking-tight">
        Rewatching
      </h2>

      {mostRewatchedMovie || mostRevisitedShow ? (
        <div className="flex flex-wrap gap-4">
          {mostRewatchedMovie ? (
            <TasteTitleCard
              mediaType="movie"
              mediaProviderId={mostRewatchedMovie.mediaProviderId}
              title={mostRewatchedMovie.title}
              poster={mostRewatchedMovie.poster}
              supportingFact={`Watched ${mostRewatchedMovie.watchCount} times`}
            />
          ) : null}
          {mostRevisitedShow ? (
            <TasteTitleCard
              mediaType="show"
              mediaProviderId={mostRevisitedShow.mediaProviderId}
              title={mostRevisitedShow.title}
              poster={mostRevisitedShow.poster}
              supportingFact={`${mostRevisitedShow.rewatchedEpisodeCount} episode rewatches`}
            />
          ) : null}
        </div>
      ) : null}

      {rewatchRatePercent !== null ? (
        <p className="text-sm text-muted-foreground">
          You've rewatched about{" "}
          <span className="font-medium text-foreground">{rewatchRatePercent}%</span> of what you've
          watched.
        </p>
      ) : null}
    </section>
  );
}
