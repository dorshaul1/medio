import { Progress } from "@/components/ui/progress";
import type { GenreExposureStat, GenreInsights } from "@/server/stats/types";

// The same restrained bar every other progress readout in this app uses
// (`components/ui/progress.tsx` — see SeasonProgress) — decorative here
// (`aria-hidden`), since the number/name beside it already carries the
// real information (see docs/stats.md).
function GenreBar({ fraction }: { fraction: number }) {
  const value = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
  return <Progress aria-hidden="true" value={value} className="w-full" />;
}

// A small curated list, never a leaderboard table — see docs/stats.md.
export function TasteGenreSection({ genres }: { genres: GenreInsights }) {
  if (genres.mostWatched.length === 0) return null;

  const max = Math.max(...genres.mostWatched.map((genre) => genre.titleCount));

  return (
    <section aria-labelledby="taste-genres" className="flex flex-col gap-4">
      <h2 id="taste-genres" className="text-lg font-medium tracking-tight">
        Genres you watch the most
      </h2>
      <ol className="flex flex-col gap-2.5">
        {genres.mostWatched.map((genre: GenreExposureStat) => (
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
    </section>
  );
}
