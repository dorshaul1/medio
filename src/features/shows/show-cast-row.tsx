import { CastMemberTile } from "@/features/media/cast-member-tile";
import { MediaRowScroller } from "@/features/media/media-row-scroller";
import { getShowAggregateCredits } from "@/server/tmdb/queries";

// Secondary to Seasons on Show Details (see the page) — a restrained
// primary-cast selection, not a full aggregate-credits dump. Its own
// Suspense boundary and failure boundary (see the page): unlike a
// movie's director (which comes from ShowDetails/MovieDetails directly),
// a show's cast needs its own aggregate-credits fetch, so this streams in
// independently rather than blocking the rest of the page.
export async function ShowCastRow({ showId }: { showId: number }) {
  try {
    const credits = await getShowAggregateCredits(showId);
    if (credits.cast.length === 0) return null;

    return (
      <section aria-labelledby="show-cast" className="flex flex-col gap-3">
        <h2 id="show-cast" className="text-lg font-medium tracking-tight">
          Cast
        </h2>
        <MediaRowScroller>
          {credits.cast.slice(0, 20).map((member) => (
            <div key={member.id} className="w-24 shrink-0 sm:w-28">
              <CastMemberTile member={member} />
            </div>
          ))}
        </MediaRowScroller>
      </section>
    );
  } catch {
    return null;
  }
}
