import { Progress } from "@/components/ui/progress";
import type { GenreExposureStat, GenreInsights, GenreRatingStat } from "@/server/stats/types";

// The same restrained bar every other progress readout in this app uses
// (`components/ui/progress.tsx` — see SeasonProgress) — decorative here
// (`aria-hidden`), since the number/name beside it already carries the
// real information (see docs/stats.md).
function GenreBar({ fraction }: { fraction: number }) {
  const value = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
  return <Progress aria-hidden="true" value={value} className="w-full" />;
}

function MostWatchedGenres({ genres }: { genres: readonly GenreExposureStat[] }) {
  const max = Math.max(...genres.map((genre) => genre.titleCount));

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-muted-foreground">You watch the most</h3>
      <ol className="flex flex-col gap-2.5">
        {genres.map((genre) => (
          <li key={genre.genreId} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-foreground">{genre.genreName}</span>
              <span className="text-muted-foreground">
                {genre.titleCount} {genre.titleCount === 1 ? "title" : "titles"}
              </span>
            </div>
            <GenreBar fraction={genre.titleCount / max} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function HighestRatedGenres({ genres }: { genres: readonly GenreRatingStat[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-muted-foreground">You rate the highest</h3>
      <ol className="flex flex-col gap-2.5">
        {genres.map((genre) => (
          <li key={genre.genreId} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-foreground">{genre.genreName}</span>
              <span className="text-muted-foreground">{genre.averageRating.toFixed(1)} avg</span>
            </div>
            <GenreBar fraction={genre.averageRating / 5} />
          </li>
        ))}
      </ol>
    </div>
  );
}

// Both lists render independently — a mature profile usually has both;
// a still-developing one may only have "most watched" (no rating signal
// yet), which is exactly why each list is its own component rather than
// one combined table forcing both to exist together.
export function TasteGenreSection({ genres }: { genres: GenreInsights }) {
  if (genres.mostWatched.length === 0 && genres.highestRated.length === 0) return null;

  return (
    <section aria-labelledby="taste-genres" className="flex flex-col gap-5">
      <h2 id="taste-genres" className="text-lg font-medium tracking-tight">
        Genres
      </h2>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {genres.mostWatched.length > 0 ? <MostWatchedGenres genres={genres.mostWatched} /> : null}
        {genres.highestRated.length > 0 ? (
          <HighestRatedGenres genres={genres.highestRated} />
        ) : null}
      </div>
    </section>
  );
}
