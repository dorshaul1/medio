import { CastMemberTile } from "@/features/media/cast-member-tile";
import { MediaRowScroller } from "@/features/media/media-row-scroller";
import type { CastMember } from "@/server/media/types";

// Stays a Server Component — MediaRowScroller (already a client boundary
// for Home/Discover's rows) is reused as-is rather than introducing a
// second horizontal-scroll implementation.
export function MovieCastRow({ cast }: { cast: readonly CastMember[] }) {
  if (cast.length === 0) return null;

  return (
    <section aria-labelledby="movie-cast" className="flex flex-col gap-3">
      <h2 id="movie-cast" className="text-lg font-medium tracking-tight">
        Cast
      </h2>
      <MediaRowScroller>
        {cast.slice(0, 20).map((member) => (
          <div key={member.id} className="w-24 shrink-0 sm:w-28">
            <CastMemberTile member={member} />
          </div>
        ))}
      </MediaRowScroller>
    </section>
  );
}
